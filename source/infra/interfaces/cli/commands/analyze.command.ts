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
import pc from 'picocolors'
import yoctoSpinner from 'yocto-spinner'

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

  console.log(pc.dim(`guardian: analyzing project at "${projectPath}"`))

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

  const analyzed = await runStep(
    'lendo package.json e dependências...',
    () => {
      return pc.green('inventário carregado')
    },
    async () => {
      return await analyzeProjectDependenciesUseCase.execute({ projectPath })
    },
  )

  const assessed = await runStep(
    'consultando vulnerabilidades...',
    () => {
      const total = analyzed.dependencies.reduce((sum, item) => sum + 1, 0)
      const vulns = analyzed.dependencies.length
      return pc.green(`análise concluída (${total} deps / ${vulns} packages)`)
    },
    async () => {
      return await assessDependencyRisksUseCase.execute({
        projectPath,
        dependencies: analyzed.dependencies,
        includeReachability: options.includeReachability,
      })
    },
  )

  const plannedActions = await runStep(
    'planejando ações...',
    () => {
      const vulns = assessed.assessedRisks.reduce(
        (sum, item) => sum + item.vulnerabilities.length,
        0,
      )
      return pc.green(`${vulns} vulnerabilidades encontradas`)
    },
    async () => {
      return await planDependencyActionsUseCase.execute({
        manifest: analyzed.manifest,
        dependencies: analyzed.dependencies,
        assessedRisks: assessed.assessedRisks,
      })
    },
  )

  const incidents = options.includeSecurityIncidents
    ? await runStep(
        'consultando radar de incidentes...',
        () => {
          return pc.green('radar carregado')
        },
        async () => {
          return await collectSecurityIncidentsUseCase.execute({
            dependencyNames: analyzed.dependencies.map(
              (item) => item.inventory.name,
            ),
            ecosystem: 'npm',
            limit: 8,
          })
        },
      )
    : {
        incidents: [],
        emergingPatterns: [],
        actionableInsights: [],
        error: null,
      }

  const levelCounts = securityScoreService.countByLevel(
    assessed.assessedRisks.map((item) => item.riskLevel),
  )

  const securityScore = securityScoreService.handle({
    dependencyScores: assessed.assessedRisks.map((item) => item.riskScore),
    criticalRisksCount: levelCounts.critical,
    highRisksCount: levelCounts.high,
  })

  const viewModel = guardianReportViewModelBuilderService.execute({
    generatedAt: formatGeneratedAt(new Date()),
    securityScoreText: securityScore.text,
    securityScoreNum: securityScore.score,
    securityColor: securityScore.color,
    criticalRisks: plannedActions.criticalRisks,
    maintenanceRisks: plannedActions.maintenanceRisks,
    safeUpdates: plannedActions.safeUpdates,
    npmInstallCmd: plannedActions.commands.npmInstallCmd,
    npmInstallDevCmd: plannedActions.commands.npmInstallDevCmd,
    npmInstallCriticalCmd: plannedActions.commands.npmInstallCriticalCmd,
    npmInstallCriticalDevCmd: plannedActions.commands.npmInstallCriticalDevCmd,
    npmCriticalNotes: plannedActions.commands.npmCriticalNotes,
    securityIncidents: incidents.incidents,
    securityIncidentsError: incidents.error,
    emergingPatterns: incidents.emergingPatterns,
    actionableInsights: incidents.actionableInsights,
  })

  const html = await runStep(
    'gerando report HTML...',
    () => {
      return pc.green('HTML gerado')
    },
    async () => {
      return await reportTemplateRenderer.render(viewModel)
    },
  )

  await runStep(
    'salvando report...',
    () => {
      return pc.green(
        `report salvo em ${pc.bold(path.relative(process.cwd(), outputPath) || outputPath)}`,
      )
    },
    async () => {
      await ensureParentDirectoryExists(outputPath)
      await writeFile(outputPath, html, 'utf8')
    },
  )
}

function runStep<T>(
  text: string,
  successText: (value: T) => string,
  fn: () => Promise<T>,
): Promise<T> {
  const spinner = yoctoSpinner({ text: `${text}` }).start()

  return fn()
    .then((value) => {
      spinner.success(`${successText(value)}`)
      return value
    })
    .catch((error) => {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : 'erro inesperado'
      spinner.error(`${pc.red('✖')} ${message}`)
      throw error
    })
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

function resolveTemplatesPath(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const currentDirectoryPath = path.dirname(currentFilePath)

  return path.resolve(currentDirectoryPath, '../infra/report/templates')
}

function formatGeneratedAt(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

async function ensureParentDirectoryExists(filePath: string): Promise<void> {
  const directoryPath = path.dirname(filePath)
  await mkdir(directoryPath, { recursive: true })
}
