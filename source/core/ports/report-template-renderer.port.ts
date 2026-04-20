export type ReportLinkViewModel = {
  label: string
  url: string
}

export type CriticalRiskCardViewModel = {
  color: string
  cve: string
  packageName: string
  currentVersion: string
  targetVersion: string
  whyItMatters: string
  howItHappens: string
  exploitSample: string | null
  impact: string
  action: string
  links: ReportLinkViewModel[]
}

export type MaintenanceRiskCardViewModel = {
  tag: string
  icon: string
  packageName: string
  description: string
  recommendation: string
  alternatives: string[]
  commands: string[]
}

export type SafeUpdateRowViewModel = {
  packageName: string
  currentVersion: string
  latestVersion: string
  riskLevel: string
  color: string
}

export type SecurityIncidentCardViewModel = {
  title: string
  type: string
  severity: string
  confidence: string
  badgeColor: string
  affectedEcosystem: string[]
  summary: string | null
  occurredAt: string | null
  sourceURL: string | null
  technicalVector: string | null
  realRisk: string | null
  detectionSignal: string | null
  recommendedAction: string | null
}

export type GuardianReportViewModel = {
  generatedAt: string
  securityScoreText: string
  securityScoreNum: number
  securityColor: string
  safeUpdatesCount: number
  criticalRisksCount: number
  maintenanceCount: number
  criticalRisks: CriticalRiskCardViewModel[]
  maintenanceRisks: MaintenanceRiskCardViewModel[]
  safeUpdates: SafeUpdateRowViewModel[]
  npmInstallCmd: string | null
  npmInstallDevCmd: string | null
  npmInstallCriticalCmd: string | null
  npmInstallCriticalDevCmd: string | null
  npmCriticalNotes: string[]
  securityIncidents: SecurityIncidentCardViewModel[]
  securityIncidentsError: string | null
  emergingPatterns: string[]
  actionableInsights: string[]
}

export interface ReportTemplateRendererPort {
  render(viewModel: GuardianReportViewModel): Promise<string>
}
