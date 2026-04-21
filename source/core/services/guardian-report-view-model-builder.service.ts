import type {
  CriticalRiskCardViewModel,
  GuardianReportViewModel,
  MaintenanceRiskCardViewModel,
  SafeUpdateRowViewModel,
  SecurityIncidentCardViewModel,
} from '../ports/report-template-renderer.port'

export type GuardianReportViewModelBuilderInput = {
  generatedAt: string
  securityScoreText: string
  securityScoreNum: number
  securityColor: string
  criticalRisks: CriticalRiskCardViewModel[]
  maintenanceRisks: MaintenanceRiskCardViewModel[]
  safeUpdates: SafeUpdateRowViewModel[]
  npmInstallCmd: string | null
  npmInstallDevCmd: string | null
  npmInstallCriticalCmd: string | null
  npmInstallCriticalDevCmd: string | null
  npmCriticalNotes: string[]
  showIncidentsRadar: boolean
  securityIncidents: SecurityIncidentCardViewModel[]
  securityIncidentsError: string | null
  emergingPatterns: string[]
  actionableInsights: string[]
}

export class GuardianReportViewModelBuilderService {
  public execute(
    input: GuardianReportViewModelBuilderInput,
  ): GuardianReportViewModel {
    return {
      generatedAt: input.generatedAt,

      securityScoreText: input.securityScoreText,
      securityScoreNum: input.securityScoreNum,
      securityColor: input.securityColor,

      safeUpdatesCount: input.safeUpdates.length,
      criticalRisksCount: input.criticalRisks.length,
      maintenanceCount: input.maintenanceRisks.length,

      criticalRisks: this.sortCriticalRisks(input.criticalRisks),
      maintenanceRisks: this.sortMaintenanceRisks(input.maintenanceRisks),
      safeUpdates: this.sortSafeUpdates(input.safeUpdates),

      npmInstallCmd: input.npmInstallCmd,
      npmInstallDevCmd: input.npmInstallDevCmd,
      npmInstallCriticalCmd: input.npmInstallCriticalCmd,
      npmInstallCriticalDevCmd: input.npmInstallCriticalDevCmd,
      npmCriticalNotes: [...input.npmCriticalNotes],

      showIncidentsRadar: input.showIncidentsRadar,
      securityIncidents: [...input.securityIncidents],
      securityIncidentsError: input.securityIncidentsError,
      emergingPatterns: [...input.emergingPatterns],
      actionableInsights: [...input.actionableInsights],
    }
  }

  private sortCriticalRisks(
    items: CriticalRiskCardViewModel[],
  ): CriticalRiskCardViewModel[] {
    return items
      .slice()
      .sort((a, b) => a.packageName.localeCompare(b.packageName))
  }

  private sortMaintenanceRisks(
    items: MaintenanceRiskCardViewModel[],
  ): MaintenanceRiskCardViewModel[] {
    return items
      .slice()
      .sort((a, b) => a.packageName.localeCompare(b.packageName))
  }

  private sortSafeUpdates(
    items: SafeUpdateRowViewModel[],
  ): SafeUpdateRowViewModel[] {
    return items
      .slice()
      .sort((a, b) => a.packageName.localeCompare(b.packageName))
  }
}
