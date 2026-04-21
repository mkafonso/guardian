import type {
  CriticalRiskNarration,
  CriticalRiskNarratorPort,
} from '../ports/critical-risk-narrator.port'
import type { ProjectManifestSnapshot } from '../ports/project-manifest-reader.port'
import type {
  CriticalRiskCardViewModel,
  MaintenanceRiskCardViewModel,
  SafeUpdateRowViewModel,
} from '../ports/report-template-renderer.port'
import {
  CommandBuilderService,
  type BuiltCommands,
} from '../services/command-builder.service'
import { CriticalRiskNarrativeService } from '../services/critical-risk-narrative.service'
import { MaintenanceNarrativeService } from '../services/maintenance-narrative.service'
import { StaticMaintenanceAnalysisService } from '../services/static-maintenance-analysis.service'
import {
  UpgradePlanningService,
  type PlannedUpgrade,
} from '../services/upgrade-planning.service'
import type { AnalyzedDependency } from './analyze-project-dependencies.usecase'
import type { AssessedDependencyRisk } from './assess-dependency-risks.usecase'

export type PlanDependencyActionsInput = {
  manifest: ProjectManifestSnapshot
  dependencies: AnalyzedDependency[]
  assessedRisks: AssessedDependencyRisk[]
}

export type PlanDependencyActionsOutput = {
  criticalRisks: CriticalRiskCardViewModel[]
  maintenanceRisks: MaintenanceRiskCardViewModel[]
  safeUpdates: SafeUpdateRowViewModel[]
  commands: BuiltCommands
}

export class PlanDependencyActionsUseCase {
  constructor(
    private readonly upgradePlanningService: UpgradePlanningService,
    private readonly commandBuilderService: CommandBuilderService,
    private readonly criticalRiskNarrativeService: CriticalRiskNarrativeService,
    private readonly maintenanceNarrativeService: MaintenanceNarrativeService,
    private readonly staticMaintenanceAnalysisService: StaticMaintenanceAnalysisService,
    private readonly criticalRiskNarrator?: CriticalRiskNarratorPort,
  ) {}

  public async execute(
    input: PlanDependencyActionsInput,
  ): Promise<PlanDependencyActionsOutput> {
    const dependencyRiskLevels = new Map(
      input.assessedRisks.map((item) => [item.packageName, item.riskLevel]),
    )

    const plannedUpgrades = this.upgradePlanningService.handle({
      dependencies: input.dependencies.map((item) => item.inventory),
      dependencyRiskLevels,
    })

    const commands = this.commandBuilderService.handle({
      safeUpdates: plannedUpgrades.safeUpdates,
      criticalUpdates: plannedUpgrades.criticalUpdates,
    })

    const criticalRisks = await this.buildCriticalRiskCards(
      input.assessedRisks.filter(
        (item) => item.riskLevel === 'critical' || item.riskLevel === 'high',
      ),
      plannedUpgrades.criticalUpdates,
    )

    const maintenanceRisks = this.buildMaintenanceRiskCards({
      manifest: input.manifest,
      dependencies: input.dependencies,
      maintenanceUpdates: plannedUpgrades.maintenanceUpdates,
    })

    const safeUpdates = this.buildSafeUpdateRows(plannedUpgrades.safeUpdates)

    return {
      criticalRisks,
      maintenanceRisks,
      safeUpdates,
      commands,
    }
  }

  private async buildCriticalRiskCards(
    assessedRisks: AssessedDependencyRisk[],
    criticalUpdates: PlannedUpgrade[],
  ): Promise<CriticalRiskCardViewModel[]> {
    const cards: CriticalRiskCardViewModel[] = []

    for (const risk of assessedRisks) {
      const primaryVulnerability = this.resolvePrimaryVulnerability(risk)
      if (!primaryVulnerability) {
        continue
      }

      const plannedUpgrade = criticalUpdates.find(
        (item) => item.packageName === risk.packageName,
      )

      const narration = await this.resolveCriticalRiskNarration({
        packageName: risk.packageName,
        currentVersion: risk.dependency.inventory.version,
        targetVersion:
          plannedUpgrade?.targetVersion ??
          risk.dependency.inventory.latestVersion ??
          '',
        vulnerability: primaryVulnerability,
        isReachable: risk.isReachable,
        isExposed: risk.isExposed,
      })

      cards.push({
        color: this.resolveCriticalRiskColor(risk.riskLevel),
        cve: this.resolvePrimaryIdentifier(primaryVulnerability),
        packageName: risk.packageName,
        currentVersion: risk.dependency.inventory.version,
        targetVersion:
          plannedUpgrade?.targetVersion ??
          risk.dependency.inventory.latestVersion ??
          risk.dependency.inventory.version,
        whyItMatters: narration.whyItMatters,
        howItHappens: narration.howItHappens,
        exploitSample: narration.exploitSample,
        impact: narration.impact,
        action: narration.action,
        links: primaryVulnerability.references.map((reference) => ({
          label: reference.label,
          url: reference.url,
        })),
      })
    }

    return cards.sort((a, b) => a.packageName.localeCompare(b.packageName))
  }

  private buildMaintenanceRiskCards(input: {
    manifest: ProjectManifestSnapshot
    dependencies: AnalyzedDependency[]
    maintenanceUpdates: PlannedUpgrade[]
  }): MaintenanceRiskCardViewModel[] {
    const staticFindings = this.staticMaintenanceAnalysisService.handle({
      dependencyNames: input.dependencies.map((item) => item.inventory.name),
      manifest: input.manifest,
    })

    const staticCards = staticFindings.map((finding) =>
      this.maintenanceNarrativeService.fromStaticFinding(finding),
    )

    const deprecatedCards = input.dependencies
      .filter((item) => Boolean(item.registry?.deprecatedMessage?.trim()))
      .map((item) => {
        const message = item.registry?.deprecatedMessage?.trim() ?? ''
        return this.maintenanceNarrativeService.fromDeprecatedPackage(
          item.inventory.name,
          message,
        )
      })

    return [...staticCards, ...deprecatedCards].sort((a, b) =>
      a.packageName.localeCompare(b.packageName),
    )
  }

  private buildSafeUpdateRows(
    safeUpdates: PlannedUpgrade[],
  ): SafeUpdateRowViewModel[] {
    return safeUpdates
      .filter((item) => item.targetVersion)
      .map((item) => ({
        packageName: item.packageName,
        currentVersion: item.currentVersion,
        latestVersion: item.targetVersion!,
        riskLevel: item.riskLevel,
        color: this.resolveSafeUpdateColor(item.riskLevel),
      }))
      .sort((a, b) => a.packageName.localeCompare(b.packageName))
  }

  private resolvePrimaryVulnerability(risk: AssessedDependencyRisk) {
    return risk.vulnerabilities.slice().sort((left, right) => {
      const leftWeight = this.resolveSeverityWeight(left.severity)
      const rightWeight = this.resolveSeverityWeight(right.severity)
      return rightWeight - leftWeight
    })[0]
  }

  private async resolveCriticalRiskNarration(input: {
    packageName: string
    currentVersion: string
    targetVersion: string
    vulnerability: AssessedDependencyRisk['vulnerabilities'][number]
    isReachable: boolean
    isExposed: boolean
  }): Promise<CriticalRiskNarration> {
    if (this.criticalRiskNarrator) {
      try {
        return await this.criticalRiskNarrator.narrate({
          packageName: input.packageName,
          currentVersion: input.currentVersion,
          targetVersion: input.targetVersion,
          vulnerabilityId: input.vulnerability.id,
          aliases: input.vulnerability.aliases,
          title: input.vulnerability.title,
          description: input.vulnerability.description,
          severity: input.vulnerability.severity,
          cvss: input.vulnerability.cvss,
          isReachable: input.isReachable,
          isExposed: input.isExposed,
          fixedIn: input.vulnerability.fixedIn,
          references: input.vulnerability.references.map((reference) => ({
            url: reference.url,
            label: reference.label,
          })),
        })
      } catch {
        return this.criticalRiskNarrativeService.handle({
          packageName: input.packageName,
          currentVersion: input.currentVersion,
          targetVersion: input.targetVersion,
          vulnerability: input.vulnerability,
          isReachable: input.isReachable,
          isExposed: input.isExposed,
        })
      }
    }

    return this.criticalRiskNarrativeService.handle({
      packageName: input.packageName,
      currentVersion: input.currentVersion,
      targetVersion: input.targetVersion,
      vulnerability: input.vulnerability,
      isReachable: input.isReachable,
      isExposed: input.isExposed,
    })
  }

  private resolvePrimaryIdentifier(
    vulnerability: AssessedDependencyRisk['vulnerabilities'][number],
  ): string {
    return vulnerability.aliases[0] ?? vulnerability.id
  }

  private resolveCriticalRiskColor(
    riskLevel: 'critical' | 'high' | 'medium' | 'low',
  ): string {
    if (riskLevel === 'critical') {
      return 'secondary'
    }

    if (riskLevel === 'high') {
      return 'tertiary'
    }

    return 'primary'
  }

  private resolveSafeUpdateColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return 'secondary'
      case 'medium':
        return 'tertiary'
      case 'low':
      default:
        return 'primary'
    }
  }

  private resolveSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical':
        return 4
      case 'high':
        return 3
      case 'medium':
        return 2
      case 'low':
        return 1
      default:
        return 0
    }
  }
}
