import type {
  DependencyInventoryItem,
  DependencyInventoryPort,
} from '../ports/dependency-inventory.port'
import type {
  PackageRegistryMetadata,
  PackageRegistryPort,
} from '../ports/package-registry.port'
import type {
  ProjectManifestReaderPort,
  ProjectManifestSnapshot,
} from '../ports/project-manifest-reader.port'
import {
  DependencyClassificationService,
  type DependencyContext,
} from '../services/dependency-classification.service'

export type AnalyzedDependency = {
  inventory: DependencyInventoryItem
  registry: PackageRegistryMetadata | null
  context: DependencyContext
}

export type AnalyzeProjectDependenciesInput = {
  projectPath: string
}

export type AnalyzeProjectDependenciesOutput = {
  manifest: ProjectManifestSnapshot
  dependencies: AnalyzedDependency[]
}

export class AnalyzeProjectDependenciesUseCase {
  constructor(
    private readonly projectManifestReader: ProjectManifestReaderPort,
    private readonly dependencyInventory: DependencyInventoryPort,
    private readonly packageRegistry: PackageRegistryPort,
    private readonly dependencyClassificationService: DependencyClassificationService,
  ) {}

  public async execute(
    input: AnalyzeProjectDependenciesInput,
  ): Promise<AnalyzeProjectDependenciesOutput> {
    const manifest = await this.projectManifestReader.read(input.projectPath)
    const inventoryResult = await this.dependencyInventory.collect(
      input.projectPath,
    )

    const registryMetadataMap = await this.loadRegistryMetadataMap(
      inventoryResult.dependencies,
    )

    const dependencies = inventoryResult.dependencies.map((dependency) => ({
      inventory: this.mergeInventoryRegistryMetadata(
        dependency,
        registryMetadataMap.get(dependency.name) ?? null,
      ),
      registry: registryMetadataMap.get(dependency.name) ?? null,
      context: this.dependencyClassificationService.handle(dependency),
    }))

    return {
      manifest,
      dependencies,
    }
  }

  private async loadRegistryMetadataMap(
    dependencies: DependencyInventoryItem[],
  ): Promise<Map<string, PackageRegistryMetadata>> {
    const uniquePackageNames = [
      ...new Set(dependencies.map((item) => item.name)),
    ]

    if (uniquePackageNames.length === 0) {
      return new Map<string, PackageRegistryMetadata>()
    }

    const metadataList =
      await this.packageRegistry.getPackagesMetadata(uniquePackageNames)

    return new Map(metadataList.map((item) => [item.name, item]))
  }

  private mergeInventoryRegistryMetadata(
    inventory: DependencyInventoryItem,
    registry: PackageRegistryMetadata | null,
  ): DependencyInventoryItem {
    return {
      ...inventory,
      latestVersion: registry?.latestVersion ?? inventory.latestVersion,
      deprecatedMessage:
        registry?.deprecatedMessage ?? inventory.deprecatedMessage,
    }
  }
}
