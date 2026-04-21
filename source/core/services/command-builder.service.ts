import type { PlannedUpgrade } from './upgrade-planning.service'

export type BuiltCommands = {
  npmInstallCmd: string | null
  npmInstallDevCmd: string | null
  npmInstallCriticalCmd: string | null
  npmInstallCriticalDevCmd: string | null
  npmCriticalNotes: string[]
}

export class CommandBuilderService {
  public handle(input: {
    safeUpdates: PlannedUpgrade[]
    criticalUpdates: PlannedUpgrade[]
  }): BuiltCommands {
    return {
      npmInstallCmd: this.buildInstallCommand(
        this.filterProduction(input.safeUpdates),
        false,
      ),
      npmInstallDevCmd: this.buildInstallCommand(
        this.filterDevelopment(input.safeUpdates),
        true,
      ),
      npmInstallCriticalCmd: this.buildInstallCommand(
        this.filterProduction(input.criticalUpdates),
        false,
      ),
      npmInstallCriticalDevCmd: this.buildInstallCommand(
        this.filterDevelopment(input.criticalUpdates),
        true,
      ),
      npmCriticalNotes: this.buildCriticalNotes(input.criticalUpdates),
    }
  }

  private filterProduction(upgrades: PlannedUpgrade[]): PlannedUpgrade[] {
    return upgrades.filter((item) => !item.isDev)
  }

  private filterDevelopment(upgrades: PlannedUpgrade[]): PlannedUpgrade[] {
    return upgrades.filter((item) => item.isDev)
  }

  private buildInstallCommand(
    upgrades: PlannedUpgrade[],
    isDevDependency: boolean,
  ): string | null {
    if (upgrades.length === 0) {
      return null
    }

    const packages = upgrades
      .filter((item) => item.targetVersion)
      .map((item) => `${item.packageName}@${item.targetVersion}`)
      .sort((a, b) => a.localeCompare(b))

    if (packages.length === 0) {
      return null
    }

    const devFlag = isDevDependency ? ' -D' : ''
    return `npm install${devFlag} ${packages.join(' ')}`
  }

  private buildCriticalNotes(upgrades: PlannedUpgrade[]): string[] {
    if (upgrades.length === 0) {
      return []
    }

    return upgrades
      .slice()
      .sort((a, b) => a.packageName.localeCompare(b.packageName))
      .map((upgrade) => {
        const suffix =
          upgrade.type === 'major'
            ? 'pode exigir validação adicional por mudança maior.'
            : 'tem correção recomendada disponível.'

        return `- ${upgrade.packageName}: ${upgrade.currentVersion} → ${upgrade.targetVersion} (${upgrade.riskLevel}) — ${suffix}`
      })
  }
}
