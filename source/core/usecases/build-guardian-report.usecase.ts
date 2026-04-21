import type {
  GuardianReportViewModel,
  ReportTemplateRendererPort,
} from '../ports/report-template-renderer.port'
import { GuardianReportViewModelBuilderService } from '../services/guardian-report-view-model-builder.service'
import { SecurityScoreService } from '../services/security-score.service'
import { AnalyzeProjectDependenciesUseCase } from './analyze-project-dependencies.usecase'
import { AssessDependencyRisksUseCase } from './assess-dependency-risks.usecase'
import { CollectSecurityIncidentsUseCase } from './collect-security-incidents.usecase'
import { PlanDependencyActionsUseCase } from './plan-dependency-actions.usecase'

export type BuildGuardianReportInput = {
  projectPath: string
  includeReachability?: boolean
  includeSecurityIncidents?: boolean
  incidentsLimit?: number
}

export type BuildGuardianReportOutput = {
  html: string
  viewModel: GuardianReportViewModel
}

export class BuildGuardianReportUseCase {
  constructor(
    private readonly analyzeProjectDependenciesUseCase: AnalyzeProjectDependenciesUseCase,
    private readonly assessDependencyRisksUseCase: AssessDependencyRisksUseCase,
    private readonly planDependencyActionsUseCase: PlanDependencyActionsUseCase,
    private readonly collectSecurityIncidentsUseCase: CollectSecurityIncidentsUseCase,
    private readonly securityScoreService: SecurityScoreService,
    private readonly guardianReportViewModelBuilderService: GuardianReportViewModelBuilderService,
    private readonly reportTemplateRenderer: ReportTemplateRendererPort,
  ) {}

  public async execute(
    input: BuildGuardianReportInput,
  ): Promise<BuildGuardianReportOutput> {
    const analyzedDependencies =
      await this.analyzeProjectDependenciesUseCase.execute({
        projectPath: input.projectPath,
      })

    const assessedRisks = await this.assessDependencyRisksUseCase.execute({
      projectPath: input.projectPath,
      dependencies: analyzedDependencies.dependencies,
      includeReachability: input.includeReachability ?? true,
    })

    const plannedActions = await this.planDependencyActionsUseCase.execute({
      manifest: analyzedDependencies.manifest,
      dependencies: analyzedDependencies.dependencies,
      assessedRisks: assessedRisks.assessedRisks,
    })

    const securityIncidents =
      input.includeSecurityIncidents === false
        ? {
            incidents: [],
            emergingPatterns: [],
            actionableInsights: [],
            error: null,
          }
        : await this.collectSecurityIncidentsUseCase.execute({
            dependencyNames: analyzedDependencies.dependencies.map(
              (item) => item.inventory.name,
            ),
            ecosystem: 'npm',
            limit: input.incidentsLimit ?? 8,
          })

    const levelCounts = this.securityScoreService.countByLevel(
      assessedRisks.assessedRisks.map((item) => item.riskLevel),
    )

    const securityScore = this.securityScoreService.handle({
      dependencyScores: assessedRisks.assessedRisks.map(
        (item) => item.riskScore,
      ),
      criticalRisksCount: levelCounts.critical,
      highRisksCount: levelCounts.high,
    })

    const viewModel = this.guardianReportViewModelBuilderService.execute({
      generatedAt: this.formatGeneratedAt(new Date()),
      securityScoreText: securityScore.text,
      securityScoreNum: securityScore.score,
      securityColor: securityScore.color,
      criticalRisks: plannedActions.criticalRisks,
      maintenanceRisks: plannedActions.maintenanceRisks,
      safeUpdates: plannedActions.safeUpdates,
      npmInstallCmd: plannedActions.commands.npmInstallCmd,
      npmInstallDevCmd: plannedActions.commands.npmInstallDevCmd,
      npmInstallCriticalCmd: plannedActions.commands.npmInstallCriticalCmd,
      npmInstallCriticalDevCmd:
        plannedActions.commands.npmInstallCriticalDevCmd,
      npmCriticalNotes: plannedActions.commands.npmCriticalNotes,
      securityIncidents: securityIncidents.incidents,
      securityIncidentsError: securityIncidents.error,
      emergingPatterns: securityIncidents.emergingPatterns,
      actionableInsights: securityIncidents.actionableInsights,
    })

    const html = await this.reportTemplateRenderer.render(viewModel)

    return {
      html,
      viewModel,
    }
  }

  private formatGeneratedAt(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  }
}
