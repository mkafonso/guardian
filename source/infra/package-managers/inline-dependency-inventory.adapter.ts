import type {
  DependencyInventoryItem,
  DependencyInventoryPort,
  DependencyInventoryResult,
} from '../../core/ports/dependency-inventory.port'
import type { PackageManagerName } from '../../core/ports/project-manifest-reader.port'

type PackageJsonFile = {
  packageManager?: unknown
  dependencies?: unknown
  devDependencies?: unknown
}

export class InlineDependencyInventoryAdapter
  implements DependencyInventoryPort
{
  constructor(private readonly rawJson: string) {}

  public async collect(
    _projectPath: string,
  ): Promise<DependencyInventoryResult> {
    const packageJson = this.parsePackageJson()
    const packageManager = this.resolvePackageManager(
      packageJson.packageManager,
    )

    const dependencies = this.readDependencyEntries(
      packageJson.dependencies,
      packageManager,
      false,
    )
    const devDependencies = this.readDependencyEntries(
      packageJson.devDependencies,
      packageManager,
      true,
    )

    return {
      packageManager,
      dependencies: [...dependencies, ...devDependencies].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }
  }

  private parsePackageJson(): PackageJsonFile {
    try {
      const parsed = JSON.parse(this.rawJson) as PackageJsonFile

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('conteúdo não é um objeto.')
      }

      return parsed
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`package.json inválido: ${error.message}`)
      }

      throw new Error('package.json inválido.')
    }
  }

  private resolvePackageManager(value: unknown): PackageManagerName {
    const raw = typeof value === 'string' ? value.toLowerCase().trim() : ''

    if (raw.startsWith('pnpm')) return 'pnpm'
    if (raw.startsWith('yarn')) return 'yarn'
    if (raw.startsWith('npm')) return 'npm'

    return 'unknown'
  }

  private readDependencyEntries(
    value: unknown,
    packageManager: PackageManagerName,
    isDev: boolean,
  ): DependencyInventoryItem[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []

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
        type: 'direct' as const,
        packageManager,
        path: `package.json#${isDev ? 'devDependencies' : 'dependencies'}`,
        isDev,
      }))
  }
}
