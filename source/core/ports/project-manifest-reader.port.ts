export type PackageManagerName = 'npm' | 'yarn' | 'pnpm' | 'unknown'

export type PackageConstraintsSnapshot = {
  resolutions: Record<string, string>
  overrides: Record<string, unknown>
}

export type ProjectManifestSnapshot = {
  projectName: string
  version: string | null
  description: string | null
  packageManager: PackageManagerName
  scripts: Record<string, string>
  engines: Record<string, string>
  license: string | null
  dependenciesCount: number
  devDependenciesCount: number
  hasPackageLock: boolean
  hasYarnLock: boolean
  hasPnpmLock: boolean

  constraints: PackageConstraintsSnapshot | null
}

export interface ProjectManifestReaderPort {
  read(projectPath: string): Promise<ProjectManifestSnapshot>
}
