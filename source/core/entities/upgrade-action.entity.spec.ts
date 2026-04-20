import { describe, expect, it } from 'vitest'
import { DependencyEntity } from './dependency.entity'
import {
  UpgradeActionEntity,
  type UpgradeActionProps,
} from './upgrade-action.entity'

describe('UpgradeActionEntity', () => {
  const baseDependency = DependencyEntity.create(
    ' Lodash ',
    ' ^4.17.21 ',
    ' 4.17.22 ',
    'direct',
    ' PNPM ',
    ' package.json ',
    false,
    {
      resolutions: { lodash: '^4.17.22' },
      overrides: { lodash: '^4.17.22' },
    },
    {
      scripts: { test: ' vitest ' },
      engines: { node: ' >=20 ' },
      license: ' MIT ',
      dependenciesCount: 10,
      devDependenciesCount: 2,
      hasPackageLock: false,
      hasYarnLock: false,
      hasPnpmLock: true,
    },
  ).toJSON()

  it('should create an upgrade action with normalized values', () => {
    const dependencyInput = {
      ...baseDependency,
      constraints: baseDependency.constraints
        ? {
            resolutions: { ...baseDependency.constraints.resolutions },
            overrides: { ...baseDependency.constraints.overrides },
          }
        : null,
      manifest: baseDependency.manifest
        ? {
            ...baseDependency.manifest,
            scripts: { ...baseDependency.manifest.scripts },
            engines: { ...baseDependency.manifest.engines },
          }
        : null,
    }

    const entity = UpgradeActionEntity.create(
      dependencyInput,
      ' ^4.17.21 ',
      ' ^4.17.22 ',
      'patch',
      '  low  ',
      '  pnpm up lodash  ',
      '  fixes vulnerabilities  ',
    )

    const json = entity.toJSON()

    expect(json.dependency.name).toBe('Lodash')
    expect(json.fromVersion).toBe('^4.17.21')
    expect(json.toVersion).toBe('^4.17.22')
    expect(json.type).toBe('patch')
    expect(json.breakingRisk).toBe('low')
    expect(json.command).toBe('pnpm up lodash')
    expect(json.reason).toBe('fixes vulnerabilities')

    dependencyInput.name = 'hack'
    if (dependencyInput.constraints) {
      dependencyInput.constraints.resolutions.lodash = 'hack'
    }
    if (dependencyInput.manifest) {
      dependencyInput.manifest.scripts.test = 'hack'
    }

    expect(entity.dependency.name).toBe('Lodash')
    expect(entity.dependency.constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.dependency.manifest?.scripts.test).toBe(' vitest ')
  })

  it('should restore with normalization', () => {
    const props: UpgradeActionProps = {
      dependency: {
        ...baseDependency,
        name: ' Lodash ',
        constraints: baseDependency.constraints
          ? {
              resolutions: { ...baseDependency.constraints.resolutions },
              overrides: { ...baseDependency.constraints.overrides },
            }
          : null,
        manifest: baseDependency.manifest
          ? {
              ...baseDependency.manifest,
              scripts: { ...baseDependency.manifest.scripts },
              engines: { ...baseDependency.manifest.engines },
            }
          : null,
      },
      fromVersion: ' ^4.17.21 ',
      toVersion: ' ^4.17.22 ',
      type: 'minor',
      breakingRisk: '  medium  ',
      command: '  pnpm up lodash@^4.17.22  ',
      reason: '  keep up to date  ',
    }

    const entity = UpgradeActionEntity.restore(props)
    const json = entity.toJSON()

    expect(json.fromVersion).toBe('^4.17.21')
    expect(json.toVersion).toBe('^4.17.22')
    expect(json.breakingRisk).toBe('medium')
    expect(json.command).toBe('pnpm up lodash@^4.17.22')
    expect(json.reason).toBe('keep up to date')
    expect(json.dependency.name).toBe(' Lodash ')

    props.dependency.name = 'hack'
    if (props.dependency.constraints) {
      props.dependency.constraints.resolutions.lodash = 'hack'
    }
    if (props.dependency.manifest) {
      props.dependency.manifest.scripts.test = 'hack'
    }

    expect(entity.dependency.name).toBe(' Lodash ')
    expect(entity.dependency.constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.dependency.manifest?.scripts.test).toBe(' vitest ')
  })

  it('should return copies (dependency) and be immutable (frozen)', () => {
    const entity = UpgradeActionEntity.create(
      baseDependency,
      '^4.17.21',
      '^4.17.22',
      'patch',
      'low',
      'pnpm up lodash',
      'reason',
    )

    const a = entity.toJSON()
    const b = entity.toJSON()

    expect(a).not.toBe(b)
    expect(a.dependency).not.toBe(b.dependency)
    expect(a.dependency.constraints).not.toBe(b.dependency.constraints)
    expect(a.dependency.manifest).not.toBe(b.dependency.manifest)

    if (a.dependency.constraints) {
      a.dependency.constraints.resolutions.lodash = 'hack'
    }
    if (a.dependency.manifest) {
      a.dependency.manifest.scripts.test = 'hack'
    }

    expect(entity.dependency.constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.dependency.manifest?.scripts.test).toBe(' vitest ')

    const internal = (entity as unknown as { props: object }).props
    expect(Object.isFrozen(internal)).toBe(true)
  })
})
