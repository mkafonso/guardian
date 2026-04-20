import crypto from 'node:crypto'

export type DependencyProps = {
  id: string
  name: string
  version: string
  ecosystem: string
  packageManager: string
  isDirect: boolean
  manifestPath: string | null
  installedVersion: string | null
  latestVersion: string | null
  homepage: string | null
  repositoryUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export class DependencyEntity {
  private props: DependencyProps

  private constructor(props: DependencyProps) {
    this.props = Object.freeze({ ...props })
  }

  static create(
    name: string,
    version: string,
    ecosystem: string,
    packageManager: string,
    isDirect: boolean,
    manifestPath: string | null = null,
    installedVersion: string | null = null,
    latestVersion: string | null = null,
    homepage: string | null = null,
    repositoryUrl: string | null = null,
  ): DependencyEntity {
    const now = new Date()

    return new DependencyEntity({
      id: crypto.randomUUID(),
      name: name.trim(),
      version: version.trim(),
      ecosystem: ecosystem.trim().toLowerCase(),
      packageManager: packageManager.trim().toLowerCase(),
      manifestPath: manifestPath?.trim() || null,
      installedVersion: installedVersion?.trim() || null,
      latestVersion: latestVersion?.trim() || null,
      homepage: homepage?.trim() || null,
      repositoryUrl: repositoryUrl?.trim() || null,
      isDirect,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(props: DependencyProps): DependencyEntity {
    return new DependencyEntity({
      ...props,
      name: props.name.trim(),
      version: props.version.trim(),
      ecosystem: props.ecosystem.trim().toLowerCase(),
      packageManager: props.packageManager.trim().toLowerCase(),
      manifestPath: props.manifestPath?.trim() || null,
      installedVersion: props.installedVersion?.trim() || null,
      latestVersion: props.latestVersion?.trim() || null,
      homepage: props.homepage?.trim() || null,
      repositoryUrl: props.repositoryUrl?.trim() || null,
    })
  }

  toJSON(): DependencyProps {
    return { ...this.props }
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get version(): string {
    return this.props.version
  }

  get ecosystem(): string {
    return this.props.ecosystem
  }

  get packageManager(): string {
    return this.props.packageManager
  }

  get isDirect(): boolean {
    return this.props.isDirect
  }

  get manifestPath(): string | null {
    return this.props.manifestPath
  }

  get installedVersion(): string | null {
    return this.props.installedVersion
  }

  get latestVersion(): string | null {
    return this.props.latestVersion
  }

  get homepage(): string | null {
    return this.props.homepage
  }

  get repositoryUrl(): string | null {
    return this.props.repositoryUrl
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
