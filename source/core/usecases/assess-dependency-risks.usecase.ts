import type {
  ReachabilityAnalyzerPort,
  ReachabilityFinding,
} from '../ports/reachability-analyzer.port'
import type {
  DependencyVulnerabilityRecord,
  VulnerabilityDataSourcePort,
} from '../ports/vulnerability-data-source.port'
import {
  RiskScoringService,
  type DependencyRiskLevel,
} from '../services/risk-scoring.service'
import type { AnalyzedDependency } from './analyze-project-dependencies.usecase'

export type AssessedDependencyRisk = {
  packageName: string
  dependency: AnalyzedDependency
  vulnerabilities: DependencyVulnerabilityRecord[]
  reachabilityFinding: ReachabilityFinding | null
  riskScore: number
  riskLevel: DependencyRiskLevel
  isReachable: boolean
  isExposed: boolean
  summary: string
}

export type AssessDependencyRisksInput = {
  projectPath: string
  dependencies: AnalyzedDependency[]
  includeReachability?: boolean
}

export type AssessDependencyRisksOutput = {
  assessedRisks: AssessedDependencyRisk[]
}

export class AssessDependencyRisksUseCase {
  constructor(
    private readonly vulnerabilityDataSource: VulnerabilityDataSourcePort,
    private readonly riskScoringService: RiskScoringService,
    private readonly reachabilityAnalyzer?: ReachabilityAnalyzerPort,
  ) {}

  public async execute(
    input: AssessDependencyRisksInput,
  ): Promise<AssessDependencyRisksOutput> {
    const vulnerabilityRecords = await this.loadVulnerabilities(
      input.dependencies,
    )
    const vulnerabilitiesByDependency =
      this.groupVulnerabilitiesByDependency(vulnerabilityRecords)

    const reachabilityMap = await this.loadReachabilityMap({
      projectPath: input.projectPath,
      dependencies: input.dependencies,
      includeReachability: input.includeReachability ?? true,
    })

    const assessedRisks = input.dependencies.map((dependency) => {
      const dependencyKey = this.buildDependencyKey(
        dependency.inventory.name,
        dependency.inventory.version,
      )

      const vulnerabilities =
        vulnerabilitiesByDependency.get(dependencyKey) ?? []

      const reachabilityFinding = reachabilityMap.get(dependencyKey) ?? null
      const isExposed = this.resolveExposure(dependency)

      const riskResult = this.riskScoringService.handle({
        vulnerabilities,
        reachabilityFinding,
        isDirectDependency: dependency.context.isDirect,
        isProductionDependency: dependency.context.isProduction,
        isExposed,
      })

      return {
        packageName: dependency.inventory.name,
        dependency,
        vulnerabilities,
        reachabilityFinding,
        riskScore: riskResult.score,
        riskLevel: riskResult.level,
        isReachable: riskResult.isReachable,
        isExposed,
        summary: riskResult.summary,
      }
    })

    return {
      assessedRisks,
    }
  }

  private async loadVulnerabilities(
    dependencies: AnalyzedDependency[],
  ): Promise<DependencyVulnerabilityRecord[]> {
    if (dependencies.length === 0) {
      return []
    }

    const result = await this.vulnerabilityDataSource.findByDependencies({
      dependencies: dependencies.map((item) => ({
        name: item.inventory.name,
        version: item.inventory.version,
      })),
    })

    return result.records
  }

  private groupVulnerabilitiesByDependency(
    records: DependencyVulnerabilityRecord[],
  ): Map<string, DependencyVulnerabilityRecord[]> {
    const grouped = new Map<string, DependencyVulnerabilityRecord[]>()

    for (const record of records) {
      const key = this.buildDependencyKey(
        record.dependencyName,
        record.dependencyVersion,
      )

      const current = grouped.get(key) ?? []
      current.push(record)
      grouped.set(key, current)
    }

    return grouped
  }

  private async loadReachabilityMap(input: {
    projectPath: string
    dependencies: AnalyzedDependency[]
    includeReachability: boolean
  }): Promise<Map<string, ReachabilityFinding>> {
    if (!input.includeReachability || !this.reachabilityAnalyzer) {
      return new Map<string, ReachabilityFinding>()
    }

    const analysisResult = await this.reachabilityAnalyzer.analyze({
      projectPath: input.projectPath,
      dependencies: input.dependencies.map((item) => ({
        name: item.inventory.name,
        version: item.inventory.version,
      })),
    })

    return new Map(
      analysisResult.findings.map((finding) => [
        this.buildDependencyKey(
          finding.dependencyName,
          finding.dependencyVersion,
        ),
        finding,
      ]),
    )
  }

  private resolveExposure(dependency: AnalyzedDependency): boolean {
    return dependency.context.isProduction && dependency.context.isDirect
  }

  private buildDependencyKey(name: string, version: string): string {
    return `${name}@${version}`
  }
}
