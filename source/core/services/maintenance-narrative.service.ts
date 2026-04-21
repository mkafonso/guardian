import type { MaintenanceRiskCardViewModel } from '../ports/report-template-renderer.port'
import type { StaticMaintenanceFinding } from './static-maintenance-analysis.service'
import type { PlannedUpgrade } from './upgrade-planning.service'

export type MaintenanceNarrative = {
  tag: string
  icon: string
  description: string
  recommendation: string
  alternatives: string[]
  commands: string[]
}

export class MaintenanceNarrativeService {
  public fromDeprecatedPackage(
    packageName: string,
    deprecatedMessage: string,
  ): MaintenanceRiskCardViewModel {
    const message = deprecatedMessage.trim()
    const alternatives = this.extractAlternativesFromDeprecatedMessage(message)

    return {
      tag: 'Descontinuado',
      icon: 'block',
      packageName,
      description: message,
      recommendation:
        alternatives.length > 0
          ? 'Alternativas sugeridas pelo NPM:'
          : 'Substitua por uma alternativa mantida.',
      alternatives,
      commands: [],
    }
  }

  public fromPlannedUpgrade(
    upgrade: PlannedUpgrade,
  ): MaintenanceRiskCardViewModel {
    return {
      packageName: upgrade.packageName,
      ...this.execute(upgrade),
    }
  }

  public fromStaticFinding(
    finding: StaticMaintenanceFinding,
  ): MaintenanceRiskCardViewModel {
    return {
      tag: finding.tag,
      icon: finding.icon,
      packageName: finding.packageName,
      description: finding.description,
      recommendation: finding.recommendation,
      alternatives: [...finding.alternatives],
      commands: [...finding.commands],
    }
  }

  public execute(upgrade: PlannedUpgrade): MaintenanceNarrative {
    return {
      tag: this.resolveTag(upgrade),
      icon: this.resolveIcon(upgrade),
      description: this.buildDescription(upgrade),
      recommendation: this.buildRecommendation(upgrade),
      alternatives: this.buildAlternatives(upgrade),
      commands: this.buildCommands(upgrade),
    }
  }

  private resolveTag(upgrade: PlannedUpgrade): string {
    if (upgrade.type === 'major') {
      return 'atenção'
    }

    if (upgrade.type === 'minor') {
      return 'manutenção'
    }

    return 'ajuste'
  }

  private resolveIcon(upgrade: PlannedUpgrade): string {
    if (upgrade.type === 'major') {
      return 'warning'
    }

    if (upgrade.type === 'minor') {
      return 'build'
    }

    return 'update'
  }

  private buildDescription(upgrade: PlannedUpgrade): string {
    return `O pacote ${upgrade.packageName} está desatualizado em relação à versão mais recente disponível. A atualização sugerida é do tipo ${upgrade.type}.`
  }

  private buildRecommendation(upgrade: PlannedUpgrade): string {
    if (!upgrade.targetVersion) {
      return 'Revisar manualmente a versão mais recente antes de executar a atualização.'
    }

    if (upgrade.type === 'major') {
      return `Planeje a atualização para ${upgrade.targetVersion} com validação funcional, pois há chance maior de quebra.`
    }

    return `Atualize para ${upgrade.targetVersion} na próxima janela de manutenção.`
  }

  private buildAlternatives(upgrade: PlannedUpgrade): string[] {
    const alternatives: string[] = []

    if (upgrade.type === 'major') {
      alternatives.push('Atualizar em branch isolada')
      alternatives.push('Executar suíte de regressão')
      alternatives.push('Validar changelog do pacote')
    }

    if (upgrade.type === 'minor') {
      alternatives.push('Aplicar em lote com outras libs similares')
    }

    return alternatives
  }

  private buildCommands(upgrade: PlannedUpgrade): string[] {
    if (!upgrade.targetVersion) {
      return []
    }

    const devFlag = upgrade.isDev ? ' -D' : ''
    return [
      `npm install${devFlag} ${upgrade.packageName}@${upgrade.targetVersion}`,
    ]
  }

  private extractAlternativesFromDeprecatedMessage(message: string): string[] {
    const found: string[] = []

    const movedMatch = message.match(
      /\b(?:moved to|moved|has moved to|replaced by|renamed to|use)\s+(@[a-z0-9._-]+\/[a-z0-9._-]+|[a-z0-9._-]+\/[a-z0-9._-]+)\b/i,
    )
    if (movedMatch?.[1]) {
      found.push(movedMatch[1])
    }

    return [...new Set(found)].slice(0, 6)
  }
}
