import type { CriticalRiskNarration } from '../ports/critical-risk-narrator.port'
import type { DependencyVulnerabilityRecord } from '../ports/vulnerability-data-source.port'

export class CriticalRiskNarrativeService {
  public handle(input: {
    packageName: string
    currentVersion: string
    targetVersion: string | null
    vulnerability: DependencyVulnerabilityRecord
    isReachable: boolean
    isExposed: boolean
  }): CriticalRiskNarration {
    return {
      whyItMatters: this.buildWhyItMatters(input),
      howItHappens: this.buildHowItHappens(input),
      impact: this.buildImpact(input),
      action: this.buildAction(input),
      exploitSample: this.buildExploitSample(input),
    }
  }

  private buildWhyItMatters(input: {
    packageName: string
    vulnerability: DependencyVulnerabilityRecord
  }): string {
    if (input.vulnerability.description.trim()) {
      return input.vulnerability.description.trim()
    }

    return `A dependência ${input.packageName} possui uma vulnerabilidade classificada como ${input.vulnerability.severity}, o que pode introduzir risco relevante ao projeto.`
  }

  private buildHowItHappens(input: {
    vulnerability: DependencyVulnerabilityRecord
    isReachable: boolean
    isExposed: boolean
  }): string {
    const parts: string[] = []

    if (input.isReachable) {
      parts.push(
        'Há indícios de que o código vulnerável pode ser alcançado pela aplicação',
      )
    } else {
      parts.push(
        'Não há evidência forte de reachability, mas a dependência continua afetada',
      )
    }

    if (input.isExposed) {
      parts.push('e existe exposição potencial por superfície externa')
    }

    parts.push(
      `segundo a fonte ${input.vulnerability.source} e os advisories associados.`,
    )

    return parts.join(' ')
  }

  private buildImpact(input: {
    vulnerability: DependencyVulnerabilityRecord
  }): string {
    const title = input.vulnerability.title.trim()

    return title
      ? `O impacto potencial está relacionado a "${title}", com severidade ${input.vulnerability.severity}.`
      : `O impacto potencial inclui comprometimento de segurança compatível com severidade ${input.vulnerability.severity}.`
  }

  private buildAction(input: {
    packageName: string
    currentVersion: string
    targetVersion: string | null
    vulnerability: DependencyVulnerabilityRecord
  }): string {
    if (input.targetVersion) {
      return `Atualize ${input.packageName} da versão ${input.currentVersion} para ${input.targetVersion} e valide os fluxos principais após a mudança.`
    }

    if (input.vulnerability.fixedIn.length > 0) {
      return `Atualize ${input.packageName} para uma das versões corrigidas disponíveis: ${input.vulnerability.fixedIn.join(', ')}.`
    }

    return `Revise a estratégia de mitigação para ${input.packageName}; não foi possível determinar automaticamente uma versão-alvo segura.`
  }

  private buildExploitSample(input: {
    vulnerability: DependencyVulnerabilityRecord
  }): string | null {
    if (input.vulnerability.severity === 'critical') {
      return '// Exemplo ilustrativo\n// Entrada maliciosa explora o pacote vulnerável\nvulnerableFunction(untrustedInput)'
    }

    return null
  }
}
