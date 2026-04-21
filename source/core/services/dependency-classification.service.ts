import type { DependencyInventoryItem } from '../ports/dependency-inventory.port'

export type DependencyUpdateClassification =
  | 'safe-update'
  | 'maintenance'
  | 'up-to-date'

export type DependencyContext = {
  isDirect: boolean
  isIndirect: boolean
  isDev: boolean
  isProduction: boolean
  isOutdated: boolean
  classification: DependencyUpdateClassification
}

export class DependencyClassificationService {
  public handle(dependency: DependencyInventoryItem): DependencyContext {
    const isDirect = this.isDirectDependency(dependency)
    const isIndirect = !isDirect
    const isDev = dependency.isDev
    const isProduction = !isDev
    const isOutdated = this.isOutdated(dependency)

    return {
      isDirect,
      isIndirect,
      isDev,
      isProduction,
      isOutdated,
      classification: this.resolveClassification({
        isOutdated,
        isDirect,
        isDev,
      }),
    }
  }

  private isDirectDependency(dependency: DependencyInventoryItem): boolean {
    return dependency.type === 'direct'
  }

  private isOutdated(dependency: DependencyInventoryItem): boolean {
    if (!dependency.latestVersion) {
      return false
    }

    return dependency.version.trim() !== dependency.latestVersion.trim()
  }

  private resolveClassification(input: {
    isOutdated: boolean
    isDirect: boolean
    isDev: boolean
  }): DependencyUpdateClassification {
    if (!input.isOutdated) {
      return 'up-to-date'
    }

    if (input.isDirect || !input.isDev) {
      return 'maintenance'
    }

    return 'safe-update'
  }
}
