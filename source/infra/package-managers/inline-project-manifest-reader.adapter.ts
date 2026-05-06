import type {
  PackageConstraintsSnapshot,
  PackageManagerName,
  ProjectManifestReaderPort,
  ProjectManifestSnapshot,
} from '../../core/ports/project-manifest-reader.port'

type PackageJsonFile = {
  name?: unknown
  version?: unknown
  description?: unknown
  scripts?: unknown
  engines?: unknown
  license?: unknown
  packageManager?: unknown
  dependencies?: unknown
  devDependencies?: unknown
  overrides?: unknown
  resolutions?: unknown
}

export class InlineProjectManifestReaderAdapter
  implements ProjectManifestReaderPort
{
  constructor(private readonly rawJson: string) {}

  public async read(_projectPath: string): Promise<ProjectManifestSnapshot> {
    const packageJson = this.parsePackageJson()
    const dependencies = this.readRecord(packageJson.dependencies)
    const devDependencies = this.readRecord(packageJson.devDependencies)

    return {
      projectName: this.readString(packageJson.name) ?? 'inline',
      version: this.readString(packageJson.version),
      description: this.readString(packageJson.description),
      packageManager: this.resolvePackageManager(packageJson.packageManager),
      scripts: this.readStringRecord(packageJson.scripts),
      engines: this.readStringRecord(packageJson.engines),
      license: this.readString(packageJson.license),
      dependenciesCount: Object.keys(dependencies).length,
      devDependenciesCount: Object.keys(devDependencies).length,
      hasPackageLock: false,
      hasYarnLock: false,
      hasPnpmLock: false,
      constraints: this.resolveConstraints(packageJson),
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

  private resolveConstraints(
    packageJson: PackageJsonFile,
  ): PackageConstraintsSnapshot | null {
    const resolutions = this.readStringRecord(packageJson.resolutions)
    const overrides = this.readRecord(packageJson.overrides)

    if (
      Object.keys(resolutions).length === 0 &&
      Object.keys(overrides).length === 0
    ) {
      return null
    }

    return { resolutions, overrides }
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  private readRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as Record<string, unknown>
  }

  private readStringRecord(value: unknown): Record<string, string> {
    const raw = this.readRecord(value)
    const result: Record<string, string> = {}

    for (const [key, entry] of Object.entries(raw)) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        result[key] = entry.trim()
      }
    }

    return result
  }
}
