import type { DependencyProps } from './dependency.entity'

export type UpgradeType = 'patch' | 'minor' | 'major'

export type UpgradeActionProps = {
  dependency: DependencyProps
  fromVersion: string
  toVersion: string
  type: UpgradeType
  breakingRisk: string
  command: string
  reason: string
}

export class UpgradeActionEntity {
  private props: UpgradeActionProps

  private constructor(props: UpgradeActionProps) {
    this.props = Object.freeze({
      ...props,
      dependency: {
        ...props.dependency,
        constraints: props.dependency.constraints
          ? {
              resolutions: { ...props.dependency.constraints.resolutions },
              overrides: { ...props.dependency.constraints.overrides },
            }
          : null,
        manifest: props.dependency.manifest
          ? {
              ...props.dependency.manifest,
              scripts: { ...props.dependency.manifest.scripts },
              engines: { ...props.dependency.manifest.engines },
            }
          : null,
      },
    })
  }

  static create(
    dependency: DependencyProps,
    fromVersion: string,
    toVersion: string,
    type: UpgradeType,
    breakingRisk: string,
    command: string,
    reason: string,
  ): UpgradeActionEntity {
    return new UpgradeActionEntity({
      dependency: {
        ...dependency,
        constraints: dependency.constraints
          ? {
              resolutions: { ...dependency.constraints.resolutions },
              overrides: { ...dependency.constraints.overrides },
            }
          : null,
        manifest: dependency.manifest
          ? {
              ...dependency.manifest,
              scripts: { ...dependency.manifest.scripts },
              engines: { ...dependency.manifest.engines },
            }
          : null,
      },
      fromVersion: fromVersion.trim(),
      toVersion: toVersion.trim(),
      type,
      breakingRisk: breakingRisk.trim(),
      command: command.trim(),
      reason: reason.trim(),
    })
  }

  static restore(props: UpgradeActionProps): UpgradeActionEntity {
    return new UpgradeActionEntity({
      ...props,
      dependency: {
        ...props.dependency,
        constraints: props.dependency.constraints
          ? {
              resolutions: { ...props.dependency.constraints.resolutions },
              overrides: { ...props.dependency.constraints.overrides },
            }
          : null,
        manifest: props.dependency.manifest
          ? {
              ...props.dependency.manifest,
              scripts: { ...props.dependency.manifest.scripts },
              engines: { ...props.dependency.manifest.engines },
            }
          : null,
      },
      fromVersion: props.fromVersion.trim(),
      toVersion: props.toVersion.trim(),
      breakingRisk: props.breakingRisk.trim(),
      command: props.command.trim(),
      reason: props.reason.trim(),
    })
  }

  toJSON(): UpgradeActionProps {
    return {
      ...this.props,
      dependency: {
        ...this.props.dependency,
        constraints: this.props.dependency.constraints
          ? {
              resolutions: { ...this.props.dependency.constraints.resolutions },
              overrides: { ...this.props.dependency.constraints.overrides },
            }
          : null,
        manifest: this.props.dependency.manifest
          ? {
              ...this.props.dependency.manifest,
              scripts: { ...this.props.dependency.manifest.scripts },
              engines: { ...this.props.dependency.manifest.engines },
            }
          : null,
      },
    }
  }

  get dependency(): DependencyProps {
    return {
      ...this.props.dependency,
      constraints: this.props.dependency.constraints
        ? {
            resolutions: { ...this.props.dependency.constraints.resolutions },
            overrides: { ...this.props.dependency.constraints.overrides },
          }
        : null,
      manifest: this.props.dependency.manifest
        ? {
            ...this.props.dependency.manifest,
            scripts: { ...this.props.dependency.manifest.scripts },
            engines: { ...this.props.dependency.manifest.engines },
          }
        : null,
    }
  }

  get fromVersion(): string {
    return this.props.fromVersion
  }

  get toVersion(): string {
    return this.props.toVersion
  }

  get type(): UpgradeType {
    return this.props.type
  }

  get breakingRisk(): string {
    return this.props.breakingRisk
  }

  get command(): string {
    return this.props.command
  }

  get reason(): string {
    return this.props.reason
  }
}
