import { readFile } from 'node:fs/promises'
import path from 'node:path'
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

export class FileSystemProjectManifestReaderAdapter
  implements ProjectManifestReaderPort
{
  public async read(projectPath: string): Promise<ProjectManifestSnapshot> {
    const manifestPath = path.join(projectPath, 'package.json')
    const packageJson = await this.readPackageJson(manifestPath)

    const hasPackageLock = await this.fileExists(
      path.join(projectPath, 'package-lock.json'),
    )
    const hasYarnLock = await this.fileExists(
      path.join(projectPath, 'yarn.lock'),
    )
    const hasPnpmLock = await this.fileExists(
      path.join(projectPath, 'pnpm-lock.yaml'),
    )

    const dependencies = this.readRecord(packageJson.dependencies)
    const devDependencies = this.readRecord(packageJson.devDependencies)

    return {
      projectName:
        this.readString(packageJson.name) ?? path.basename(projectPath),
      version: this.readString(packageJson.version),
      description: this.readString(packageJson.description),
      packageManager: this.resolvePackageManager({
        rawPackageManager: this.readString(packageJson.packageManager),
        hasPackageLock,
        hasYarnLock,
        hasPnpmLock,
      }),
      scripts: this.readStringRecord(packageJson.scripts),
      engines: this.readStringRecord(packageJson.engines),
      license: this.readString(packageJson.license),
      dependenciesCount: Object.keys(dependencies).length,
      devDependenciesCount: Object.keys(devDependencies).length,
      hasPackageLock,
      hasYarnLock,
      hasPnpmLock,
      constraints: this.resolveConstraints(packageJson),
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
        throw new Error(`Falha ao ler package.json: ${error.message}`)
      }

      throw new Error('Falha ao ler package.json.')
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await readFile(filePath)
      return true
    } catch {
      return false
    }
  }

  private resolvePackageManager(input: {
    rawPackageManager: string | null
    hasPackageLock: boolean
    hasYarnLock: boolean
    hasPnpmLock: boolean
  }): PackageManagerName {
    const packageManager = input.rawPackageManager?.toLowerCase().trim() ?? ''

    if (packageManager.startsWith('pnpm')) {
      return 'pnpm'
    }

    if (packageManager.startsWith('yarn')) {
      return 'yarn'
    }

    if (packageManager.startsWith('npm')) {
      return 'npm'
    }

    if (input.hasPnpmLock) {
      return 'pnpm'
    }

    if (input.hasYarnLock) {
      return 'yarn'
    }

    if (input.hasPackageLock) {
      return 'npm'
    }

    return 'unknown'
  }

  private resolveConstraints(
    packageJson: PackageJsonFile,
  ): PackageConstraintsSnapshot | null {
    const resolutions = this.readStringRecord(packageJson.resolutions)
    const overrides = this.readUnknownRecord(packageJson.overrides)

    if (
      Object.keys(resolutions).length === 0 &&
      Object.keys(overrides).length === 0
    ) {
      return null
    }

    return {
      resolutions,
      overrides,
    }
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  private readRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    return value as Record<string, unknown>
  }

  private readUnknownRecord(value: unknown): Record<string, unknown> {
    return this.readRecord(value)
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
