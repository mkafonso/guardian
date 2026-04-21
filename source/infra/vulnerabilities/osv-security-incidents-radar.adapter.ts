import type {
  SecurityIncidentRecord,
  SecurityIncidentSeverity,
  SecurityIncidentType,
  SecurityIncidentsRadarInput,
  SecurityIncidentsRadarPort,
  SecurityIncidentsRadarResult,
} from '@/core/ports/security-incidents-radar.port'

type FeedArticle = {
  source: 'securityweek' | 'bleepingcomputer'
  title: string
  link: string
  publishedAt: string | null
  summary: string | null
}

type GitHubAdvisoryItem = {
  ghsa_id?: string
  summary?: string
  description?: string
  severity?: string
  published_at?: string
  updated_at?: string
  html_url?: string
  cve_id?: string | null
  vulnerabilities?: Array<{
    package?: {
      ecosystem?: string
      name?: string
    }
    vulnerable_version_range?: string
    first_patched_version?: {
      identifier?: string
    } | null
  }>
}

type RadarCandidate = {
  incident: SecurityIncidentRecord
  score: number
  sources: Set<string>
  bucket: RadarBucket
}

type RadarBucket = 'ecosystem-vendor-hot' | 'malware'

export type OsvSecurityIncidentsRadarAdapterOptions = {
  githubToken?: string
  now?: Date
}

export class OsvSecurityIncidentsRadarAdapter
  implements SecurityIncidentsRadarPort
{
  private readonly githubToken: string
  private readonly now: Date

  constructor(options: OsvSecurityIncidentsRadarAdapterOptions = {}) {
    this.githubToken = options.githubToken ?? ''
    this.now = options.now ?? new Date()
  }

  public async collect(
    input: SecurityIncidentsRadarInput,
  ): Promise<SecurityIncidentsRadarResult> {
    const sevenDaysAgo = this.resolveSevenDaysAgoIsoDate()

    const [
      securityWeekArticles,
      bleepingComputerArticles,
      reviewedAdvisories,
      malwareAdvisories,
    ] = await Promise.allSettled([
      this.fetchSecurityWeekArticles(),
      this.fetchBleepingComputerArticles(),
      this.fetchGitHubAdvisories({
        ecosystem: 'npm',
        modifiedSince: sevenDaysAgo,
        severity: ['high', 'critical'],
        type: 'reviewed',
        perPage: 20,
      }),
      this.fetchGitHubAdvisories({
        ecosystem: 'npm',
        modifiedSince: sevenDaysAgo,
        type: 'malware',
        perPage: 20,
      }),
    ])

    const candidates = new Map<string, RadarCandidate>()

    for (const article of this.unwrapSettled(securityWeekArticles)) {
      const candidate = this.mapFeedArticleToCandidate(
        article,
        input.projectDependencies,
      )

      this.addOrMergeCandidate(candidates, candidate)
    }

    for (const article of this.unwrapSettled(bleepingComputerArticles)) {
      const candidate = this.mapFeedArticleToCandidate(
        article,
        input.projectDependencies,
      )

      this.addOrMergeCandidate(candidates, candidate)
    }

    for (const advisory of this.unwrapSettled(reviewedAdvisories)) {
      const candidate = this.mapGitHubAdvisoryToCandidate(
        advisory,
        input.projectDependencies,
      )

      if (candidate) {
        this.addOrMergeCandidate(candidates, candidate)
      }
    }

    for (const advisory of this.unwrapSettled(malwareAdvisories)) {
      const candidate = this.mapGitHubAdvisoryToCandidate(
        advisory,
        input.projectDependencies,
      )

      if (candidate) {
        this.addOrMergeCandidate(candidates, candidate)
      }
    }

    const incidents = this.selectTopIncidents(
      [...candidates.values()],
      input.limit ?? 6,
    )

    return {
      incidents,
      emergingPatterns: [],
      actionableInsights: [],
    }
  }

  private async fetchSecurityWeekArticles(): Promise<FeedArticle[]> {
    const xml = await this.fetchText('https://www.securityweek.com/feed')

    return this.parseRssItems(xml).map((item) => ({
      source: 'securityweek',
      title: item.title,
      link: item.link,
      publishedAt: item.pubDate,
      summary: item.description,
    }))
  }

  private async fetchBleepingComputerArticles(): Promise<FeedArticle[]> {
    const xml = await this.fetchText('https://www.bleepingcomputer.com/feed/')

    return this.parseRssItems(xml).map((item) => ({
      source: 'bleepingcomputer',
      title: item.title,
      link: item.link,
      publishedAt: item.pubDate,
      summary: item.description,
    }))
  }

  private async fetchGitHubAdvisories(input: {
    ecosystem: 'npm'
    modifiedSince: string
    severity?: string[]
    type?: 'reviewed' | 'malware'
    perPage: number
  }): Promise<GitHubAdvisoryItem[]> {
    const url = new URL('https://api.github.com/advisories')

    url.searchParams.set('ecosystem', input.ecosystem)
    url.searchParams.set('modified', `>=${input.modifiedSince}`)
    url.searchParams.set('sort', 'updated')
    url.searchParams.set('direction', 'desc')
    url.searchParams.set('per_page', String(input.perPage))

    if (input.type) {
      url.searchParams.set('type', input.type)
    }

    if (input.severity && input.severity.length > 0) {
      url.searchParams.set('severity', input.severity.join(','))
    }

    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    })

    if (this.githubToken) {
      headers.set('Authorization', `Bearer ${this.githubToken}`)
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(
        `GitHub advisories request failed with status ${response.status}`,
      )
    }

    const payload = (await response.json()) as GitHubAdvisoryItem[]
    return Array.isArray(payload) ? payload : []
  }

  private mapFeedArticleToCandidate(
    article: FeedArticle,
    projectDependencies: string[],
  ): RadarCandidate {
    const normalizedText = this.normalizeText(
      `${article.title} ${article.summary ?? ''}`,
    )

    const incidentType = this.resolveIncidentType(normalizedText)
    const severity = this.resolveSeverityFromText(normalizedText, incidentType)
    const confidence = article.source === 'securityweek' ? 'high' : 'medium'
    const affectedEcosystem = this.resolveAffectedEcosystem(normalizedText)
    const bucket = this.resolveRadarBucket({
      type: incidentType,
      text: normalizedText,
      affectedEcosystem,
    })

    const score = this.calculateHotnessScore({
      source: article.source,
      type: incidentType,
      severity,
      publishedAt: article.publishedAt,
      text: normalizedText,
      projectDependencies,
      bucket,
    })

    return {
      incident: {
        title: article.title,
        type: incidentType,
        severity,
        confidence,
        affectedEcosystem,
        summary: article.summary,
        occurredAt: article.publishedAt,
        sourceUrl: article.link,
        technicalVector: null,
        realRisk: null,
        detectionSignal: null,
        recommendedAction: null,
      },
      score,
      sources: new Set([article.link]),
      bucket,
    }
  }

  private mapGitHubAdvisoryToCandidate(
    advisory: GitHubAdvisoryItem,
    projectDependencies: string[],
  ): RadarCandidate | null {
    const title = advisory.summary?.trim()

    if (!title) {
      return null
    }

    const description = advisory.description?.trim() ?? null
    const normalizedText = this.normalizeText(`${title} ${description ?? ''}`)

    const packages =
      advisory.vulnerabilities
        ?.map((item) => item.package?.name?.trim().toLowerCase())
        .filter((item): item is string => Boolean(item)) ?? []

    const affectedEcosystem = this.resolveAdvisoryAffectedEcosystem(
      normalizedText,
      packages,
    )

    if (
      !this.looksRelevantToJavaScriptEcosystem(
        normalizedText,
        affectedEcosystem,
      )
    ) {
      return null
    }

    const incidentType = this.resolveIncidentType(normalizedText)
    const severity = this.resolveSeverityFromAdvisory(
      advisory.severity,
      incidentType,
    )
    const occurredAt = advisory.updated_at ?? advisory.published_at ?? null
    const bucket = this.resolveRadarBucket({
      type: incidentType,
      text: normalizedText,
      affectedEcosystem,
    })

    const score = this.calculateHotnessScore({
      source: advisory.html_url?.includes('/advisories/') ? 'github' : 'other',
      type: incidentType,
      severity,
      publishedAt: occurredAt,
      text: normalizedText,
      projectDependencies,
      affectedPackages: packages,
      bucket,
    })

    return {
      incident: {
        title,
        type: incidentType,
        severity,
        confidence: 'high',
        affectedEcosystem,
        summary: description,
        occurredAt,
        sourceUrl: advisory.html_url ?? null,
        technicalVector: null,
        realRisk: null,
        detectionSignal: null,
        recommendedAction: this.buildAdvisoryRecommendedAction(advisory),
      },
      score,
      sources: new Set([advisory.html_url ?? title]),
      bucket,
    }
  }

  private resolveRadarBucket(input: {
    type: SecurityIncidentType
    text: string
    affectedEcosystem: string[]
  }): RadarBucket {
    if (
      input.type === 'malware' ||
      input.type === 'typosquatting' ||
      input.type === 'registry-abuse'
    ) {
      return 'malware'
    }

    if (
      input.type === 'supply-chain' ||
      input.type === 'account-takeover' ||
      input.type === 'token-leak' ||
      input.type === 'ecosystem-alert'
    ) {
      return 'ecosystem-vendor-hot'
    }

    if (
      this.containsAny(input.text, [
        'vercel',
        'next',
        'next.js',
        'nextjs',
        'react',
        'axios',
        'node',
        'npm',
        'typescript',
        'javascript',
        'maintainer',
        'maintainer account',
        'security incident',
        'security bulletin',
        'breach',
        'hack',
        'hacked',
        'compromise',
        'compromised',
        'leak',
        'token',
      ])
    ) {
      return 'ecosystem-vendor-hot'
    }

    if (
      input.affectedEcosystem.some((item) =>
        ['react', 'next.js', 'node', 'typescript', 'javascript'].includes(item),
      )
    ) {
      return 'ecosystem-vendor-hot'
    }

    return 'malware'
  }

  private selectTopIncidents(
    candidates: RadarCandidate[],
    limit: number,
  ): SecurityIncidentRecord[] {
    const sorted = candidates
      .slice()
      .sort((left, right) => right.score - left.score)

    const ecosystemVendorHot = sorted.filter(
      (candidate) => candidate.bucket === 'ecosystem-vendor-hot',
    )
    const malware = sorted.filter((candidate) => candidate.bucket === 'malware')

    const selected: RadarCandidate[] = []
    const selectedKeys = new Set<string>()

    const addCandidate = (candidate: RadarCandidate): void => {
      const key = this.buildDeduplicationKey(candidate.incident)

      if (selectedKeys.has(key)) {
        return
      }

      selected.push(candidate)
      selectedKeys.add(key)
    }

    for (const candidate of ecosystemVendorHot.slice(0, 4)) {
      addCandidate(candidate)
    }

    for (const candidate of malware.slice(0, 2)) {
      addCandidate(candidate)
    }

    if (selected.length < limit) {
      for (const candidate of sorted) {
        addCandidate(candidate)

        if (selected.length >= limit) {
          break
        }
      }
    }

    return selected.slice(0, limit).map((candidate) => candidate.incident)
  }

  private addOrMergeCandidate(
    target: Map<string, RadarCandidate>,
    candidate: RadarCandidate,
  ): void {
    const key = this.buildDeduplicationKey(candidate.incident)
    const existing = target.get(key)

    if (!existing) {
      target.set(key, candidate)
      return
    }

    const mergedIncident: SecurityIncidentRecord = {
      ...existing.incident,
      summary: existing.incident.summary ?? candidate.incident.summary,
      occurredAt: existing.incident.occurredAt ?? candidate.incident.occurredAt,
      sourceUrl: existing.incident.sourceUrl ?? candidate.incident.sourceUrl,
      technicalVector:
        existing.incident.technicalVector ?? candidate.incident.technicalVector,
      realRisk: existing.incident.realRisk ?? candidate.incident.realRisk,
      detectionSignal:
        existing.incident.detectionSignal ?? candidate.incident.detectionSignal,
      recommendedAction:
        existing.incident.recommendedAction ??
        candidate.incident.recommendedAction,
      affectedEcosystem: this.mergeStringLists(
        existing.incident.affectedEcosystem,
        candidate.incident.affectedEcosystem,
      ),
      severity: this.pickHigherSeverity(
        existing.incident.severity,
        candidate.incident.severity,
      ),
      confidence: this.pickHigherConfidence(
        existing.incident.confidence,
        candidate.incident.confidence,
      ),
    }

    const mergedSources = new Set([...existing.sources, ...candidate.sources])
    const mergedBucket =
      existing.bucket === 'ecosystem-vendor-hot' ||
      candidate.bucket === 'ecosystem-vendor-hot'
        ? 'ecosystem-vendor-hot'
        : 'malware'

    target.set(key, {
      incident: mergedIncident,
      score: Math.max(existing.score, candidate.score) + mergedSources.size - 1,
      sources: mergedSources,
      bucket: mergedBucket,
    })
  }

  private parseRssItems(xml: string): Array<{
    title: string
    link: string
    pubDate: string | null
    description: string | null
  }> {
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? []

    return itemMatches.map((itemXml) => ({
      title: this.decodeXml(this.extractTag(itemXml, 'title') ?? 'Untitled'),
      link: this.decodeXml(this.extractTag(itemXml, 'link') ?? ''),
      pubDate: this.extractTag(itemXml, 'pubDate'),
      description: this.stripHtml(
        this.decodeXml(this.extractTag(itemXml, 'description') ?? ''),
      ),
    }))
  }

  private extractTag(xml: string, tagName: string): string | null {
    const matcher = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i')
    const cdataMatcher = new RegExp(
      `<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`,
      'i',
    )

    const cdataMatch = xml.match(cdataMatcher)
    if (cdataMatch?.[1]) {
      return cdataMatch[1].trim()
    }

    const match = xml.match(matcher)
    return match?.[1]?.trim() ?? null
  }

  private fetchText = async (url: string): Promise<string> => {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Feed request failed for ${url}: ${response.status}`)
    }

    return response.text()
  }

  private resolveIncidentType(normalizedText: string): SecurityIncidentType {
    if (
      this.containsAny(normalizedText, [
        'malware',
        'malicious package',
        'trojanized',
        'credential stealer',
        'infostealer',
      ])
    ) {
      return 'malware'
    }

    if (
      this.containsAny(normalizedText, [
        'supply chain',
        'dependency attack',
        'package compromise',
        'dependency compromise',
        'build pipeline',
      ])
    ) {
      return 'supply-chain'
    }

    if (
      this.containsAny(normalizedText, [
        'account takeover',
        'hacked account',
        'compromised account',
        'maintainer account',
        'developer account hacked',
      ])
    ) {
      return 'account-takeover'
    }

    if (this.containsAny(normalizedText, ['typosquatting', 'typosquat'])) {
      return 'typosquatting'
    }

    if (
      this.containsAny(normalizedText, [
        'registry abuse',
        'registry compromise',
        'registry attack',
      ])
    ) {
      return 'registry-abuse'
    }

    if (
      this.containsAny(normalizedText, [
        'token leak',
        'token stolen',
        'secret leak',
        'credentials exposed',
        'stolen token',
        'secret exposed',
      ])
    ) {
      return 'token-leak'
    }

    if (
      this.containsAny(normalizedText, [
        'ecosystem alert',
        'security bulletin',
        'security incident',
        'breach',
        'compromise',
        'compromised',
        'incident',
      ])
    ) {
      return 'ecosystem-alert'
    }

    return 'other'
  }

  private resolveSeverityFromText(
    normalizedText: string,
    type: SecurityIncidentType,
  ): SecurityIncidentSeverity {
    if (type === 'supply-chain') {
      return 'critical'
    }

    if (type === 'account-takeover' || type === 'token-leak') {
      return 'high'
    }

    if (type === 'ecosystem-alert') {
      return 'high'
    }

    if (type === 'malware') {
      return 'critical'
    }

    if (
      this.containsAny(normalizedText, [
        'critical',
        'severe',
        'compromise',
        'compromised',
      ])
    ) {
      return 'critical'
    }

    if (
      this.containsAny(normalizedText, [
        'high severity',
        'high-risk',
        'breach',
        'hacked',
      ])
    ) {
      return 'high'
    }

    return 'medium'
  }

  private resolveSeverityFromAdvisory(
    advisorySeverity: string | undefined,
    type: SecurityIncidentType,
  ): SecurityIncidentSeverity {
    if (type === 'supply-chain' || type === 'malware') {
      return 'critical'
    }

    switch ((advisorySeverity ?? '').trim().toLowerCase()) {
      case 'critical':
        return 'critical'
      case 'high':
        return 'high'
      case 'medium':
        return 'medium'
      case 'low':
        return 'low'
      default:
        return 'unknown'
    }
  }

  private resolveAffectedEcosystem(normalizedText: string): string[] {
    const items = new Set<string>()

    if (this.containsAny(normalizedText, ['npm'])) {
      items.add('npm')
    }

    if (this.containsAny(normalizedText, ['node', 'node.js', 'nodejs'])) {
      items.add('node')
    }

    if (this.containsAny(normalizedText, ['javascript'])) {
      items.add('javascript')
    }

    if (this.containsAny(normalizedText, ['typescript'])) {
      items.add('typescript')
    }

    if (this.containsAny(normalizedText, ['react'])) {
      items.add('react')
    }

    if (this.containsAny(normalizedText, ['next', 'next.js', 'nextjs'])) {
      items.add('next.js')
    }

    if (this.containsAny(normalizedText, ['axios'])) {
      items.add('javascript')
      items.add('node')
    }

    if (items.size === 0) {
      items.add('npm')
    }

    return [...items]
  }

  private resolveAdvisoryAffectedEcosystem(
    normalizedText: string,
    packages: string[],
  ): string[] {
    const items = new Set<string>(['npm'])

    for (const pkg of packages) {
      if (pkg === 'react' || pkg.startsWith('react-')) {
        items.add('react')
      }

      if (pkg === 'next') {
        items.add('next.js')
      }

      if (pkg === 'axios') {
        items.add('javascript')
        items.add('node')
      }

      if (pkg.includes('typescript')) {
        items.add('typescript')
      }
    }

    for (const item of this.resolveAffectedEcosystem(normalizedText)) {
      items.add(item)
    }

    return [...items]
  }

  private calculateHotnessScore(input: {
    source: 'securityweek' | 'bleepingcomputer' | 'github' | 'other'
    type: SecurityIncidentType
    severity: SecurityIncidentSeverity
    publishedAt: string | null
    text: string
    projectDependencies: string[]
    bucket: RadarBucket
    affectedPackages?: string[]
  }): number {
    let score = 0

    switch (input.source) {
      case 'securityweek':
      case 'bleepingcomputer':
        score += 4
        break
      case 'github':
        score += 2
        break
      default:
        score += 1
    }

    switch (input.type) {
      case 'supply-chain':
        score += 6
        break
      case 'account-takeover':
        score += 6
        break
      case 'token-leak':
        score += 5
        break
      case 'ecosystem-alert':
        score += 5
        break
      case 'malware':
        score += 4
        break
      case 'typosquatting':
      case 'registry-abuse':
        score += 3
        break
      default:
        score += 1
        break
    }

    switch (input.severity) {
      case 'critical':
        score += 4
        break
      case 'high':
        score += 3
        break
      case 'medium':
        score += 1
        break
      default:
        break
    }

    score += this.resolveRecencyScore(input.publishedAt)

    if (input.bucket === 'ecosystem-vendor-hot') {
      score += 4
    }

    if (
      this.containsAny(input.text, [
        'vercel',
        'next',
        'next.js',
        'nextjs',
        'react',
        'axios',
        'node',
        'npm',
        'typescript',
        'javascript',
        'maintainer',
        'security incident',
        'security bulletin',
        'breach',
        'hack',
        'hacked',
        'compromise',
        'compromised',
      ])
    ) {
      score += 4
    }

    const matchedProjectDependency = this.findDependencyMention(
      input.text,
      input.projectDependencies,
      input.affectedPackages ?? [],
    )

    if (matchedProjectDependency) {
      score += 3
    }

    return score
  }

  private resolveRecencyScore(publishedAt: string | null): number {
    if (!publishedAt) {
      return 0
    }

    const timestamp = Date.parse(publishedAt)

    if (Number.isNaN(timestamp)) {
      return 0
    }

    const diffInHours =
      Math.abs(this.now.getTime() - timestamp) / (1000 * 60 * 60)

    if (diffInHours <= 24) {
      return 5
    }

    if (diffInHours <= 72) {
      return 4
    }

    if (diffInHours <= 7 * 24) {
      return 2
    }

    return 0
  }

  private buildAdvisoryRecommendedAction(
    advisory: GitHubAdvisoryItem,
  ): string | null {
    const fixedVersions =
      advisory.vulnerabilities
        ?.map((item) => item.first_patched_version?.identifier?.trim())
        .filter((item): item is string => Boolean(item)) ?? []

    if (fixedVersions.length === 0) {
      return null
    }

    return `Atualize para uma versão corrigida, como: ${fixedVersions.join(', ')}.`
  }

  private findDependencyMention(
    normalizedText: string,
    projectDependencies: string[],
    affectedPackages: string[],
  ): string | null {
    for (const pkg of affectedPackages) {
      if (
        projectDependencies.some(
          (dependency) => dependency.toLowerCase() === pkg,
        )
      ) {
        return pkg
      }
    }

    for (const dependency of projectDependencies) {
      const normalizedDependency = dependency.trim().toLowerCase()

      if (!normalizedDependency) {
        continue
      }

      if (normalizedText.includes(normalizedDependency)) {
        return normalizedDependency
      }
    }

    return null
  }

  private looksRelevantToJavaScriptEcosystem(
    normalizedText: string,
    affectedEcosystem: string[],
  ): boolean {
    if (
      affectedEcosystem.some((item) =>
        [
          'npm',
          'node',
          'javascript',
          'typescript',
          'react',
          'next.js',
        ].includes(item),
      )
    ) {
      return true
    }

    return this.containsAny(normalizedText, [
      'npm',
      'node',
      'node.js',
      'nodejs',
      'javascript',
      'typescript',
      'react',
      'axios',
      'next',
      'next.js',
      'nextjs',
      'vercel',
    ])
  }

  private buildDeduplicationKey(incident: SecurityIncidentRecord): string {
    return this.normalizeText(incident.title)
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private pickHigherSeverity(
    left: SecurityIncidentSeverity,
    right: SecurityIncidentSeverity,
  ): SecurityIncidentSeverity {
    const order: Record<SecurityIncidentSeverity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      unknown: 1,
    }

    return order[left] >= order[right] ? left : right
  }

  private pickHigherConfidence(
    left: 'high' | 'medium' | 'low',
    right: 'high' | 'medium' | 'low',
  ): 'high' | 'medium' | 'low' {
    const order = {
      high: 3,
      medium: 2,
      low: 1,
    }

    return order[left] >= order[right] ? left : right
  }

  private mergeStringLists(left: string[], right: string[]): string[] {
    return [...new Set([...left, ...right])]
  }

  private containsAny(text: string, terms: string[]): boolean {
    return terms.some((term) => text.includes(term))
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase()
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private unwrapSettled<T>(result: PromiseSettledResult<T>): T {
    if (result.status === 'fulfilled') {
      return result.value
    }

    return [] as T
  }

  private resolveSevenDaysAgoIsoDate(): string {
    const value = new Date(this.now)
    value.setUTCDate(value.getUTCDate() - 7)

    return value.toISOString().slice(0, 10)
  }
}
