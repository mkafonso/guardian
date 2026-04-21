import type { ReachabilityFinding } from '../ports/reachability-analyzer.port'
import type {
  DependencyVulnerabilityRecord,
  VulnerabilitySeverity,
} from '../ports/vulnerability-data-source.port'

export type DependencyRiskLevel = 'critical' | 'high' | 'medium' | 'low'

export type DependencyRiskScoreResult = {
  score: number
  level: DependencyRiskLevel
  hasCriticalVulnerability: boolean
  hasHighVulnerability: boolean
  vulnerabilityCount: number
  isReachable: boolean
  summary: string
}

type RiskScoringWeights = {
  critical: number
  high: number
  medium: number
  low: number
  reachableBonus: number
  directDependencyBonus: number
  productionDependencyBonus: number
  exposedBonus: number
  maxScore: number
}

const DEFAULT_WEIGHTS: RiskScoringWeights = {
  critical: 45,
  high: 28,
  medium: 12,
  low: 4,
  reachableBonus: 18,
  directDependencyBonus: 6,
  productionDependencyBonus: 8,
  exposedBonus: 12,
  maxScore: 100,
}

export class RiskScoringService {
  constructor(private readonly weights: RiskScoringWeights = DEFAULT_WEIGHTS) {}

  public handle(input: {
    vulnerabilities: DependencyVulnerabilityRecord[]
    reachabilityFinding?: ReachabilityFinding | null
    isDirectDependency: boolean
    isProductionDependency: boolean
    isExposed?: boolean
  }): DependencyRiskScoreResult {
    const baseScore = this.calculateBaseScore(input.vulnerabilities)
    const contextualScore = this.calculateContextualScore({
      reachabilityFinding: input.reachabilityFinding,
      isDirectDependency: input.isDirectDependency,
      isProductionDependency: input.isProductionDependency,
      isExposed: input.isExposed ?? false,
    })

    const score = this.clampScore(baseScore + contextualScore)
    const level = this.resolveRiskLevel(score)

    return {
      score,
      level,
      hasCriticalVulnerability: this.hasSeverity(
        input.vulnerabilities,
        'critical',
      ),
      hasHighVulnerability: this.hasSeverity(input.vulnerabilities, 'high'),
      vulnerabilityCount: input.vulnerabilities.length,
      isReachable: input.reachabilityFinding?.isReachable ?? false,
      summary: this.buildSummary({
        vulnerabilities: input.vulnerabilities,
        level,
        score,
        isReachable: input.reachabilityFinding?.isReachable ?? false,
      }),
    }
  }

  private calculateBaseScore(
    vulnerabilities: DependencyVulnerabilityRecord[],
  ): number {
    return vulnerabilities.reduce((total, vulnerability) => {
      return total + this.resolveSeverityWeight(vulnerability.severity)
    }, 0)
  }

  private calculateContextualScore(input: {
    reachabilityFinding?: ReachabilityFinding | null
    isDirectDependency: boolean
    isProductionDependency: boolean
    isExposed: boolean
  }): number {
    let score = 0

    if (input.reachabilityFinding?.isReachable) {
      score += this.weights.reachableBonus
    }

    if (input.isDirectDependency) {
      score += this.weights.directDependencyBonus
    }

    if (input.isProductionDependency) {
      score += this.weights.productionDependencyBonus
    }

    if (input.isExposed) {
      score += this.weights.exposedBonus
    }

    return score
  }

  private resolveSeverityWeight(severity: VulnerabilitySeverity): number {
    switch (severity) {
      case 'critical':
        return this.weights.critical
      case 'high':
        return this.weights.high
      case 'medium':
        return this.weights.medium
      case 'low':
        return this.weights.low
      case 'unknown':
      default:
        return this.weights.low
    }
  }

  private resolveRiskLevel(score: number): DependencyRiskLevel {
    if (score >= 80) {
      return 'critical'
    }

    if (score >= 50) {
      return 'high'
    }

    if (score >= 20) {
      return 'medium'
    }

    return 'low'
  }

  private hasSeverity(
    vulnerabilities: DependencyVulnerabilityRecord[],
    severity: VulnerabilitySeverity,
  ): boolean {
    return vulnerabilities.some((item) => item.severity === severity)
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(score, this.weights.maxScore))
  }

  private buildSummary(input: {
    vulnerabilities: DependencyVulnerabilityRecord[]
    level: DependencyRiskLevel
    score: number
    isReachable: boolean
  }): string {
    if (input.vulnerabilities.length === 0) {
      return 'Nenhuma vulnerabilidade relevante encontrada para esta dependência.'
    }

    const highestSeverity = this.resolveHighestSeverity(input.vulnerabilities)
    const reachabilityText = input.isReachable
      ? 'Há evidência de uso alcançável no código.'
      : 'Não foi encontrada evidência clara de reachability.'

    return [
      `${input.vulnerabilities.length} vulnerabilidade(s) associada(s).`,
      `Maior severidade observada: ${highestSeverity}.`,
      `Nível calculado: ${input.level} (${input.score}/100).`,
      reachabilityText,
    ].join(' ')
  }

  private resolveHighestSeverity(
    vulnerabilities: DependencyVulnerabilityRecord[],
  ): VulnerabilitySeverity {
    if (this.hasSeverity(vulnerabilities, 'critical')) return 'critical'
    if (this.hasSeverity(vulnerabilities, 'high')) return 'high'
    if (this.hasSeverity(vulnerabilities, 'medium')) return 'medium'
    if (this.hasSeverity(vulnerabilities, 'low')) return 'low'
    return 'unknown'
  }
}
