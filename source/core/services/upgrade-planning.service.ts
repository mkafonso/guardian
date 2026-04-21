import type { DependencyInventoryItem } from '../ports/dependency-inventory.port'
import type { DependencyRiskLevel } from './risk-scoring.service'

export type PlannedUpgradeType = 'patch' | 'minor' | 'major'

export type PlannedUpgrade = {
  packageName: string
  currentVersion: string
  targetVersion: string | null
  type: PlannedUpgradeType
  isDev: boolean
  riskLevel: DependencyRiskLevel
  shouldUpdateNow: boolean
  isSafeUpdate: boolean
  isMaintenanceUpdate: boolean
  isCriticalUpdate: boolean
}

export type UpgradePlanningResult = {
  safeUpdates: PlannedUpgrade[]
  maintenanceUpdates: PlannedUpgrade[]
  criticalUpdates: PlannedUpgrade[]
}

export class UpgradePlanningService {
  public handle(input: {
    dependencies: DependencyInventoryItem[]
    dependencyRiskLevels: Map<string, DependencyRiskLevel>
  }): UpgradePlanningResult {
    const plannedUpgrades = input.dependencies
      .filter((dependency) => this.hasTargetVersion(dependency))
      .filter((dependency) => this.isOutdated(dependency))
      .map((dependency) =>
        this.planSingleUpgrade(
          dependency,
          input.dependencyRiskLevels.get(dependency.name) ?? 'low',
        ),
      )

    return {
      safeUpdates: plannedUpgrades.filter((item) => item.isSafeUpdate),
      maintenanceUpdates: plannedUpgrades.filter(
        (item) => item.isMaintenanceUpdate,
      ),
      criticalUpdates: plannedUpgrades.filter((item) => item.isCriticalUpdate),
    }
  }

  private planSingleUpgrade(
    dependency: DependencyInventoryItem,
    riskLevel: DependencyRiskLevel,
  ): PlannedUpgrade {
    const targetVersion = dependency.latestVersion

    if (!targetVersion) {
      throw new Error(
        `Cannot resolve upgrade type for dependency "${dependency.name}" without latestVersion.`,
      )
    }

    const upgradeType = this.resolveUpgradeType(
      dependency.version,
      targetVersion,
    )

    const isCriticalUpdate = riskLevel === 'critical' || riskLevel === 'high'
    const isSafeUpdate =
      !isCriticalUpdate && (upgradeType === 'patch' || dependency.isDev)

    const isMaintenanceUpdate = !isCriticalUpdate && !isSafeUpdate

    return {
      packageName: dependency.name,
      currentVersion: dependency.version,
      targetVersion: dependency.latestVersion,
      type: upgradeType,
      isDev: dependency.isDev,
      riskLevel,
      shouldUpdateNow: isCriticalUpdate || isSafeUpdate,
      isSafeUpdate,
      isMaintenanceUpdate,
      isCriticalUpdate,
    }
  }

  private hasTargetVersion(dependency: DependencyInventoryItem): boolean {
    return Boolean(dependency.latestVersion?.trim())
  }

  private isOutdated(dependency: DependencyInventoryItem): boolean {
    return (
      dependency.latestVersion !== null &&
      dependency.version !== dependency.latestVersion
    )
  }

  private resolveUpgradeType(
    currentVersion: string,
    targetVersion: string,
  ): PlannedUpgradeType {
    const current = this.parseSemver(currentVersion)
    const target = this.parseSemver(targetVersion)

    if (!current || !target) {
      return 'patch'
    }

    if (target.major > current.major) {
      return 'major'
    }

    if (target.minor > current.minor) {
      return 'minor'
    }

    return 'patch'
  }

  private parseSemver(version: string): {
    major: number
    minor: number
    patch: number
  } | null {
    const normalized = version.trim().replace(/^[^\d]*/, '')
    const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)/)

    if (!match) {
      return null
    }

    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    }
  }
}
