import { AnalyzeProjectDependenciesUseCase } from './core/usecases/analyze-project-dependencies.usecase'
import { AssessDependencyRisksUseCase } from './core/usecases/assess-dependency-risks.usecase'
import { BuildGuardianReportUseCase } from './core/usecases/build-guardian-report.usecase'
import { CollectSecurityIncidentsUseCase } from './core/usecases/collect-security-incidents.usecase'
import { PlanDependencyActionsUseCase } from './core/usecases/plan-dependency-actions.usecase'
import { CommandBuilderService } from './core/services/command-builder.service'
import { CriticalRiskNarrativeService } from './core/services/critical-risk-narrative.service'
import { DependencyClassificationService } from './core/services/dependency-classification.service'
import { GuardianReportViewModelBuilderService } from './core/services/guardian-report-view-model-builder.service'
import { IncidentRadarMappingService } from './core/services/incident-radar-mapping.service'
import { MaintenanceNarrativeService } from './core/services/maintenance-narrative.service'
import { RiskScoringService } from './core/services/risk-scoring.service'
import { SecurityScoreService } from './core/services/security-score.service'
import { StaticMaintenanceAnalysisService } from './core/services/static-maintenance-analysis.service'
import { UpgradePlanningService } from './core/services/upgrade-planning.service'
import { OpenAISecurityIncidentNarratorAdapter } from './infra/ai/openai-security-incident-narrator.adapter'
import { InlineDependencyInventoryAdapter } from './infra/package-managers/inline-dependency-inventory.adapter'
import { InlineProjectManifestReaderAdapter } from './infra/package-managers/inline-project-manifest-reader.adapter'
import { NpmRegistryAdapter } from './infra/registries/npm-registry.adapter'
import { SimpleReachabilityAnalyzerAdapter } from './infra/reachability/simple-reachability-analyzer.adapter'
import { OsvSecurityIncidentsRadarAdapter } from './infra/vulnerabilities/osv-security-incidents-radar.adapter'
import { OsvVulnerabilityDataSourceAdapter } from './infra/vulnerabilities/osv-vulnerability-data-source.adapter'
import type {
  GuardianReportViewModel,
  ReportTemplateRendererPort,
} from './core/ports/report-template-renderer.port'

export type Report = GuardianReportViewModel

class NoopReportTemplateRendererAdapter implements ReportTemplateRendererPort {
  public async render(): Promise<string> {
    return ''
  }
}

function hasSecurityIncidentsConfig(): boolean {
  return (
    typeof process.env.OPENAI_API_KEY === 'string' &&
    process.env.OPENAI_API_KEY.trim().length > 0 &&
    typeof process.env.GITHUB_TOKEN === 'string' &&
    process.env.GITHUB_TOKEN.trim().length > 0
  )
}

export async function analyzePackageJsonText(text: string): Promise<Report> {
  const projectManifestReader = new InlineProjectManifestReaderAdapter(text)
  const dependencyInventory = new InlineDependencyInventoryAdapter(text)
  const packageRegistry = new NpmRegistryAdapter()
  const vulnerabilityDataSource = new OsvVulnerabilityDataSourceAdapter()
  const reachabilityAnalyzer = new SimpleReachabilityAnalyzerAdapter()

  const dependencyClassificationService = new DependencyClassificationService()
  const riskScoringService = new RiskScoringService()
  const upgradePlanningService = new UpgradePlanningService()
  const commandBuilderService = new CommandBuilderService()
  const criticalRiskNarrativeService = new CriticalRiskNarrativeService()
  const maintenanceNarrativeService = new MaintenanceNarrativeService()
  const staticMaintenanceAnalysisService =
    new StaticMaintenanceAnalysisService()
  const incidentRadarMappingService = new IncidentRadarMappingService()
  const guardianReportViewModelBuilderService =
    new GuardianReportViewModelBuilderService()

  const analyzeProjectDependenciesUseCase =
    new AnalyzeProjectDependenciesUseCase(
      projectManifestReader,
      dependencyInventory,
      packageRegistry,
      dependencyClassificationService,
    )

  const assessDependencyRisksUseCase = new AssessDependencyRisksUseCase(
    vulnerabilityDataSource,
    riskScoringService,
    reachabilityAnalyzer,
  )

  const planDependencyActionsUseCase = new PlanDependencyActionsUseCase(
    upgradePlanningService,
    commandBuilderService,
    criticalRiskNarrativeService,
    maintenanceNarrativeService,
    staticMaintenanceAnalysisService,
  )

  const collectSecurityIncidentsUseCase = hasSecurityIncidentsConfig()
    ? new CollectSecurityIncidentsUseCase(
        incidentRadarMappingService,
        new OsvSecurityIncidentsRadarAdapter({
          githubToken: process.env.GITHUB_TOKEN!.trim(),
        }),
        new OpenAISecurityIncidentNarratorAdapter({
          apiKey: process.env.OPENAI_API_KEY!.trim(),
        }),
      )
    : new CollectSecurityIncidentsUseCase(incidentRadarMappingService)

  const buildGuardianReportUseCase = new BuildGuardianReportUseCase(
    analyzeProjectDependenciesUseCase,
    assessDependencyRisksUseCase,
    planDependencyActionsUseCase,
    collectSecurityIncidentsUseCase,
    new SecurityScoreService(),
    guardianReportViewModelBuilderService,
    new NoopReportTemplateRendererAdapter(),
  )

  const result = await buildGuardianReportUseCase.execute({
    projectPath: '',
    includeReachability: false,
    includeSecurityIncidents: hasSecurityIncidentsConfig(),
    incidentsLimit: 8,
  })

  return result.viewModel
}
