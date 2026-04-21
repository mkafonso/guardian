import type { DependencyRiskLevel } from './risk-scoring.service'

export type SecurityScoreSummary = {
  score: number
  text: string
  color: string
}

export class SecurityScoreService {
  public handle(input: {
    dependencyScores: number[]
    criticalRisksCount: number
    highRisksCount: number
  }): SecurityScoreSummary {
    const score = this.calculateScore(input)

    return {
      score,
      text: this.resolveText(score),
      color: this.resolveColor(score),
    }
  }

  private calculateScore(input: {
    dependencyScores: number[]
    criticalRisksCount: number
    highRisksCount: number
  }): number {
    if (input.dependencyScores.length === 0) {
      return 100
    }

    const averageRisk =
      input.dependencyScores.reduce((total, score) => total + score, 0) /
      input.dependencyScores.length

    const criticalPenalty = input.criticalRisksCount * 8
    const highPenalty = input.highRisksCount * 4

    const rawScore = 100 - averageRisk - criticalPenalty - highPenalty

    return Math.max(0, Math.min(100, Math.round(rawScore)))
  }

  private resolveText(score: number): string {
    if (score >= 85) {
      return 'Seguro'
    }

    if (score >= 65) {
      return 'Atenção'
    }

    if (score >= 40) {
      return 'Risco Alto'
    }

    return 'Crítico'
  }

  private resolveColor(score: number): string {
    if (score >= 85) {
      return 'primary'
    }

    if (score >= 65) {
      return 'tertiary'
    }

    if (score >= 40) {
      return 'secondary'
    }

    return 'error'
  }

  public countByLevel(
    levels: DependencyRiskLevel[],
  ): Record<DependencyRiskLevel, number> {
    return levels.reduce<Record<DependencyRiskLevel, number>>(
      (acc, level) => {
        acc[level] += 1
        return acc
      },
      {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    )
  }
}
