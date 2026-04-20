export type DependencyType = 'direct' | 'indirect'

export type PackageConstraintsProps = {
  resolutions: Record<string, string>
  overrides: Record<string, unknown>
}

export type ProjectManifestProps = {
  scripts: Record<string, string>
  engines: Record<string, string>
  license: string
  dependenciesCount: number
  devDependenciesCount: number
  hasPackageLock: boolean
  hasYarnLock: boolean
  hasPnpmLock: boolean
}

export type DependencyProps = {
  name: string
  version: string
  latestVersion: string
  type: DependencyType
  packageManager: string
  path: string
  isDev: boolean
  constraints: PackageConstraintsProps | null
  manifest: ProjectManifestProps | null
}

export class DependencyEntity {
  private props: DependencyProps

  private constructor(props: DependencyProps) {
    this.props = Object.freeze({
      ...props,
      constraints: props.constraints
        ? {
            resolutions: { ...props.constraints.resolutions },
            overrides: { ...props.constraints.overrides },
          }
        : null,
      manifest: props.manifest
        ? {
            ...props.manifest,
            scripts: { ...props.manifest.scripts },
            engines: { ...props.manifest.engines },
          }
        : null,
    })
  }

  static create(
    name: string,
    version: string,
    latestVersion: string,
    type: DependencyType,
    packageManager: string,
    path: string,
    isDev: boolean,
    constraints: PackageConstraintsProps | null = null,
    manifest: ProjectManifestProps | null = null,
  ): DependencyEntity {
    return new DependencyEntity({
      name: name.trim(),
      version: version.trim(),
      latestVersion: latestVersion.trim(),
      type,
      packageManager: packageManager.trim().toLowerCase(),
      path: path.trim(),
      isDev,
      constraints: constraints
        ? {
            resolutions: { ...constraints.resolutions },
            overrides: { ...constraints.overrides },
          }
        : null,
      manifest: manifest
        ? {
            ...manifest,
            scripts: { ...manifest.scripts },
            engines: { ...manifest.engines },
          }
        : null,
    })
  }

  static restore(props: DependencyProps): DependencyEntity {
    return new DependencyEntity({
      ...props,
      name: props.name.trim(),
      version: props.version.trim(),
      latestVersion: props.latestVersion.trim(),
      packageManager: props.packageManager.trim().toLowerCase(),
      path: props.path.trim(),
      constraints: props.constraints
        ? {
            resolutions: { ...props.constraints.resolutions },
            overrides: { ...props.constraints.overrides },
          }
        : null,
      manifest: props.manifest
        ? {
            ...props.manifest,
            scripts: { ...props.manifest.scripts },
            engines: { ...props.manifest.engines },
          }
        : null,
    })
  }

  toJSON(): DependencyProps {
    return {
      ...this.props,
      constraints: this.props.constraints
        ? {
            resolutions: { ...this.props.constraints.resolutions },
            overrides: { ...this.props.constraints.overrides },
          }
        : null,
      manifest: this.props.manifest
        ? {
            ...this.props.manifest,
            scripts: { ...this.props.manifest.scripts },
            engines: { ...this.props.manifest.engines },
          }
        : null,
    }
  }

  get name(): string {
    return this.props.name
  }

  get version(): string {
    return this.props.version
  }

  get latestVersion(): string {
    return this.props.latestVersion
  }

  get type(): DependencyType {
    return this.props.type
  }

  get packageManager(): string {
    return this.props.packageManager
  }

  get path(): string {
    return this.props.path
  }

  get isDev(): boolean {
    return this.props.isDev
  }

  get constraints(): PackageConstraintsProps | null {
    return this.props.constraints
      ? {
          resolutions: { ...this.props.constraints.resolutions },
          overrides: { ...this.props.constraints.overrides },
        }
      : null
  }

  get manifest(): ProjectManifestProps | null {
    return this.props.manifest
      ? {
          ...this.props.manifest,
          scripts: { ...this.props.manifest.scripts },
          engines: { ...this.props.manifest.engines },
        }
      : null
  }
}
