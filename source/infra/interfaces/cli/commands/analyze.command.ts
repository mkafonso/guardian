import { CommandBuilderService } from '@/core/services/command-builder.service'
import { CriticalRiskNarrativeService } from '@/core/services/critical-risk-narrative.service'
import { DependencyClassificationService } from '@/core/services/dependency-classification.service'
import { GuardianReportViewModelBuilderService } from '@/core/services/guardian-report-view-model-builder.service'
import { IncidentRadarMappingService } from '@/core/services/incident-radar-mapping.service'
import { MaintenanceNarrativeService } from '@/core/services/maintenance-narrative.service'
import { RiskScoringService } from '@/core/services/risk-scoring.service'
import { SecurityScoreService } from '@/core/services/security-score.service'
import { StaticMaintenanceAnalysisService } from '@/core/services/static-maintenance-analysis.service'
import { UpgradePlanningService } from '@/core/services/upgrade-planning.service'
import { AnalyzeProjectDependenciesUseCase } from '@/core/usecases/analyze-project-dependencies.usecase'
import { AssessDependencyRisksUseCase } from '@/core/usecases/assess-dependency-risks.usecase'
import { BuildGuardianReportUseCase } from '@/core/usecases/build-guardian-report.usecase'
import { CollectSecurityIncidentsUseCase } from '@/core/usecases/collect-security-incidents.usecase'
import { PlanDependencyActionsUseCase } from '@/core/usecases/plan-dependency-actions.usecase'
import { FileSystemProjectManifestReaderAdapter } from '@/infra/package-managers/file-system-project-manifest-reader.adapter'
import { PackageJsonDependencyInventoryAdapter } from '@/infra/package-managers/package-json-dependency-inventory.adapter'
import { SimpleReachabilityAnalyzerAdapter } from '@/infra/reachability/simple-reachability-analyzer.adapter'
import { NpmRegistryAdapter } from '@/infra/registries/npm-registry.adapter'
import { HtmlTemplateRendererAdapter } from '@/infra/report/html-template-renderer.adapter'
import { OsvVulnerabilityDataSourceAdapter } from '@/infra/vulnerabilities/osv-vulnerability-data-source.adapter'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type AnalyzeCommandOptions = {
  projectPath: string
  outputPath: string
  includeSecurityIncidents: boolean
  includeReachability: boolean
}

export async function runAnalyzeCommand(args: string[]): Promise<void> {
  const options = parseAnalyzeCommandOptions(args)

  const projectPath = path.resolve(process.cwd(), options.projectPath)
  const outputPath = path.resolve(process.cwd(), options.outputPath)

  console.log(`guardian: analyzing project at "${projectPath}"...`)

  const useCase = createBuildGuardianReportUseCase()

  const result = await useCase.execute({
    projectPath,
    includeReachability: options.includeReachability,
    includeSecurityIncidents: options.includeSecurityIncidents,
  })

  await ensureParentDirectoryExists(outputPath)
  await writeFile(outputPath, result.html, 'utf8')

  console.log('guardian: report generated successfully')
  console.log(`guardian: output -> ${outputPath}`)
}

function parseAnalyzeCommandOptions(args: string[]): AnalyzeCommandOptions {
  let projectPath = '.'
  let outputPath = 'guardian-report.html'
  let includeSecurityIncidents = true
  let includeReachability = true

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (!arg) {
      continue
    }

    if (arg === '--no-incidents') {
      includeSecurityIncidents = false
      continue
    }

    if (arg === '--no-reachability') {
      includeReachability = false
      continue
    }

    if (arg === '--output' || arg === '-o') {
      const value = args[index + 1]

      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --output option.')
      }

      outputPath = value
      index += 1
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}".`)
    }

    projectPath = arg
  }

  return {
    projectPath,
    outputPath,
    includeSecurityIncidents,
    includeReachability,
  }
}

function createBuildGuardianReportUseCase(): BuildGuardianReportUseCase {
  const dependencyClassificationService = new DependencyClassificationService()
  const riskScoringService = new RiskScoringService()
  const upgradePlanningService = new UpgradePlanningService()
  const commandBuilderService = new CommandBuilderService()
  const securityScoreService = new SecurityScoreService()
  const criticalRiskNarrativeService = new CriticalRiskNarrativeService()
  const maintenanceNarrativeService = new MaintenanceNarrativeService()
  const staticMaintenanceAnalysisService =
    new StaticMaintenanceAnalysisService()
  const incidentRadarMappingService = new IncidentRadarMappingService()
  const guardianReportViewModelBuilderService =
    new GuardianReportViewModelBuilderService()

  const projectManifestReader = new FileSystemProjectManifestReaderAdapter()
  const dependencyInventory = new PackageJsonDependencyInventoryAdapter(
    projectManifestReader,
  )
  const packageRegistry = new NpmRegistryAdapter()
  const vulnerabilityDataSource = new OsvVulnerabilityDataSourceAdapter()
  const reachabilityAnalyzer = new SimpleReachabilityAnalyzerAdapter()

  const reportTemplateRenderer = new HtmlTemplateRendererAdapter({
    templatesPath: resolveTemplatesPath(),
    templateName: 'guardian-report.eta',
    useCache: false,
  })

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
    undefined,
  )

  const collectSecurityIncidentsUseCase = new CollectSecurityIncidentsUseCase(
    incidentRadarMappingService,
    undefined,
  )

  return new BuildGuardianReportUseCase(
    analyzeProjectDependenciesUseCase,
    assessDependencyRisksUseCase,
    planDependencyActionsUseCase,
    collectSecurityIncidentsUseCase,
    securityScoreService,
    guardianReportViewModelBuilderService,
    reportTemplateRenderer,
  )
}

function resolveTemplatesPath(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const currentDirectoryPath = path.dirname(currentFilePath)

  return path.resolve(currentDirectoryPath, '../../../report/templates')
}

async function ensureParentDirectoryExists(filePath: string): Promise<void> {
  const directoryPath = path.dirname(filePath)
  await mkdir(directoryPath, { recursive: true })
}
