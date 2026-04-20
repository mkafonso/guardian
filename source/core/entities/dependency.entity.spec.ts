import { describe, expect, it } from 'vitest'
import { DependencyEntity, type DependencyProps } from './dependency.entity'

describe('DependencyEntity', () => {
  const baseInput = {
    name: ' Lodash ',
    latestVersion: ' 4.17.22 ',
    version: ' ^4.17.21 ',
    type: 'direct' as const,
    packageManager: ' PNPM ',
    path: ' package.json ',
    isDev: false,
    constraints: {
      resolutions: { lodash: '^4.17.22' },
      overrides: { lodash: '^4.17.22' },
    },
    manifest: {
      scripts: { test: ' vitest ' },
      engines: { node: ' >=20 ' },
      license: ' MIT ',
      dependenciesCount: 10,
      devDependenciesCount: 2,
      hasPackageLock: false,
      hasYarnLock: false,
      hasPnpmLock: true,
    },
  }

  it('should create a dependency with normalized values', () => {
    const constraintsInput = {
      resolutions: { ...baseInput.constraints.resolutions },
      overrides: { ...baseInput.constraints.overrides },
    }

    const manifestInput = {
      ...baseInput.manifest,
      scripts: { ...baseInput.manifest.scripts },
      engines: { ...baseInput.manifest.engines },
    }

    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.latestVersion,
      baseInput.type,
      baseInput.packageManager,
      baseInput.path,
      baseInput.isDev,
      constraintsInput,
      manifestInput,
    )

    const json = entity.toJSON()

    expect(json.name).toBe('Lodash')
    expect(json.version).toBe('^4.17.21')
    expect(json.latestVersion).toBe('4.17.22')
    expect(json.type).toBe('direct')
    expect(json.packageManager).toBe('pnpm')
    expect(json.path).toBe('package.json')
    expect(json.isDev).toBe(false)
    expect(json.constraints).toEqual({
      resolutions: { lodash: '^4.17.22' },
      overrides: { lodash: '^4.17.22' },
    })
    expect(json.manifest).toEqual({
      scripts: { test: ' vitest ' },
      engines: { node: ' >=20 ' },
      license: ' MIT ',
      dependenciesCount: 10,
      devDependenciesCount: 2,
      hasPackageLock: false,
      hasYarnLock: false,
      hasPnpmLock: true,
    })

    constraintsInput.resolutions.lodash = 'hack'
    manifestInput.scripts.test = 'hack'

    expect(entity.toJSON().constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.toJSON().manifest?.scripts.test).toBe(' vitest ')
  })

  it('should return copies in toJSON and getters (no shared references)', () => {
    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.latestVersion,
      baseInput.type,
      baseInput.packageManager,
      baseInput.path,
      baseInput.isDev,
      baseInput.constraints,
      baseInput.manifest,
    )

    const jsonA = entity.toJSON()
    const jsonB = entity.toJSON()

    expect(jsonA).not.toBe(jsonB)
    expect(jsonA.constraints).not.toBe(jsonB.constraints)
    expect(jsonA.manifest).not.toBe(jsonB.manifest)

    jsonA.constraints?.resolutions &&
      (jsonA.constraints.resolutions.lodash = 'hack')
    jsonA.manifest?.scripts && (jsonA.manifest.scripts.test = 'hack')

    expect(entity.toJSON().constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.toJSON().manifest?.scripts.test).toBe(' vitest ')

    const constraints = entity.constraints
    const manifest = entity.manifest

    expect(constraints).not.toBeNull()
    expect(manifest).not.toBeNull()

    if (constraints) constraints.resolutions.lodash = 'hack'
    if (manifest) manifest.scripts.test = 'hack'

    expect(entity.constraints?.resolutions.lodash).toBe('^4.17.22')
    expect(entity.manifest?.scripts.test).toBe(' vitest ')
  })

  it('should restore with normalization', () => {
    const props: DependencyProps = {
      name: ' Lodash ',
      version: ' ^4.17.21 ',
      latestVersion: ' 4.17.22 ',
      type: 'indirect',
      packageManager: ' PNPM ',
      path: ' package.json ',
      isDev: true,
      constraints: {
        resolutions: { lodash: '^4.17.22' },
        overrides: { lodash: '^4.17.22' },
      },
      manifest: {
        scripts: { test: ' vitest ' },
        engines: { node: ' >=20 ' },
        license: ' MIT ',
        dependenciesCount: 10,
        devDependenciesCount: 2,
        hasPackageLock: false,
        hasYarnLock: false,
        hasPnpmLock: true,
      },
    }

    const entity = DependencyEntity.restore(props)
    const json = entity.toJSON()

    expect(json.name).toBe('Lodash')
    expect(json.version).toBe('^4.17.21')
    expect(json.latestVersion).toBe('4.17.22')
    expect(json.type).toBe('indirect')
    expect(json.packageManager).toBe('pnpm')
    expect(json.path).toBe('package.json')
    expect(json.isDev).toBe(true)
  })

  it('should be immutable (frozen)', () => {
    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.latestVersion,
      baseInput.type,
      baseInput.packageManager,
      baseInput.path,
      baseInput.isDev,
      baseInput.constraints,
      baseInput.manifest,
    )

    const json = entity.toJSON()

    expect(() => {
      json.name = 'hack'
    }).not.toThrow()

    expect(entity.toJSON().name).toBe('Lodash')

    const internal = (entity as unknown as { props: object }).props
    expect(Object.isFrozen(internal)).toBe(true)
  })
})
