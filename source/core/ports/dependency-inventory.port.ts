export type DependencyType = 'direct' | 'indirect'

export type DependencyInventoryItem = {
  name: string
  version: string
  latestVersion: string | null
  type: DependencyType
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown'
  path: string
  isDev: boolean
}

export type DependencyInventoryResult = {
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown'
  dependencies: DependencyInventoryItem[]
}

export interface DependencyInventoryPort {
  collect(projectPath: string): Promise<DependencyInventoryResult>
}
