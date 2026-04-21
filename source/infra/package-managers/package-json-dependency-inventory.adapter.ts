import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  DependencyInventoryItem,
  DependencyInventoryPort,
  DependencyInventoryResult,
} from '../../core/ports/dependency-inventory.port'
import type {
  PackageManagerName,
  ProjectManifestReaderPort,
} from '../../core/ports/project-manifest-reader.port'

type PackageJsonFile = {
  dependencies?: unknown
  devDependencies?: unknown
}

export class PackageJsonDependencyInventoryAdapter
  implements DependencyInventoryPort
{
  constructor(
    private readonly projectManifestReader: ProjectManifestReaderPort,
  ) {}

  public async collect(
    projectPath: string,
  ): Promise<DependencyInventoryResult> {
    const manifest = await this.projectManifestReader.read(projectPath)
    const packageJson = await this.readPackageJson(
      path.join(projectPath, 'package.json'),
    )

    const dependencies = this.readDependencyEntries(
      packageJson.dependencies,
      manifest.packageManager,
      false,
    )

    const devDependencies = this.readDependencyEntries(
      packageJson.devDependencies,
      manifest.packageManager,
      true,
    )

    return {
      packageManager: manifest.packageManager,
      dependencies: [...dependencies, ...devDependencies].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }
  }

  private async readPackageJson(filePath: string): Promise<PackageJsonFile> {
    try {
      const rawContent = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(rawContent) as PackageJsonFile

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('package.json inválido: conteúdo não é um objeto.')
      }

      return parsed
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Falha ao ler dependências do package.json: ${error.message}`,
        )
      }

      throw new Error('Falha ao ler dependências do package.json.')
    }
  }

  private readDependencyEntries(
    value: unknown,
    packageManager: PackageManagerName,
    isDev: boolean,
  ): DependencyInventoryItem[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return []
    }

    const entries = value as Record<string, unknown>

    return Object.entries(entries)
      .filter(
        ([, version]) =>
          typeof version === 'string' && version.trim().length > 0,
      )
      .map(([name, version]) => ({
        name: name.trim(),
        version: String(version).trim(),
        latestVersion: null,
        deprecatedMessage: null,
        type: 'direct',
        packageManager,
        path: `package.json#${isDev ? 'devDependencies' : 'dependencies'}`,
        isDev,
      }))
  }
}
