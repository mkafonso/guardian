import { describe, expect, it } from 'vitest'

import { DependencyEntity, type DependencyProps } from './dependency.entity'

describe('DependencyEntity', () => {
  const baseInput = {
    name: ' Lodash ',
    version: ' ^4.17.21 ',
    ecosystem: ' NPM ',
    packageManager: ' PNPM ',
    isDirect: true,
    manifestPath: ' package.json ',
    installedVersion: ' 4.17.21 ',
    latestVersion: ' 4.17.22 ',
    homepage: ' https://lodash.com/ ',
    repositoryUrl: ' https://github.com/lodash/lodash ',
  }

  it('should create a dependency with normalized values', () => {
    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.ecosystem,
      baseInput.packageManager,
      baseInput.isDirect,
      baseInput.manifestPath,
      baseInput.installedVersion,
      baseInput.latestVersion,
      baseInput.homepage,
      baseInput.repositoryUrl,
    )

    const json = entity.toJSON()

    expect(json.id).toBeDefined()
    expect(json.name).toBe('Lodash')
    expect(json.version).toBe('^4.17.21')
    expect(json.ecosystem).toBe('npm')
    expect(json.packageManager).toBe('pnpm')
    expect(json.isDirect).toBe(true)
    expect(json.manifestPath).toBe('package.json')
    expect(json.installedVersion).toBe('4.17.21')
    expect(json.latestVersion).toBe('4.17.22')
    expect(json.homepage).toBe('https://lodash.com/')
    expect(json.repositoryUrl).toBe('https://github.com/lodash/lodash')
    expect(json.createdAt).toBeInstanceOf(Date)
    expect(json.updatedAt).toBeInstanceOf(Date)
    expect(json.createdAt).toBe(json.updatedAt)
  })

  it('should generate different ids', () => {
    const a = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.ecosystem,
      baseInput.packageManager,
      baseInput.isDirect,
    )

    const b = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.ecosystem,
      baseInput.packageManager,
      baseInput.isDirect,
    )

    expect(a.toJSON().id).not.toBe(b.toJSON().id)
  })

  it('should coerce optional string fields to null when blank', () => {
    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.ecosystem,
      baseInput.packageManager,
      baseInput.isDirect,
      '   ',
      ' ',
      '',
      '  ',
      '\n',
    )

    const json = entity.toJSON()

    expect(json.manifestPath).toBeNull()
    expect(json.installedVersion).toBeNull()
    expect(json.latestVersion).toBeNull()
    expect(json.homepage).toBeNull()
    expect(json.repositoryUrl).toBeNull()
  })

  it('should restore with normalization', () => {
    const props: DependencyProps = {
      id: 'id',
      name: ' Lodash ',
      version: ' ^4.17.21 ',
      ecosystem: ' NPM ',
      packageManager: ' PNPM ',
      isDirect: false,
      manifestPath: ' package.json ',
      installedVersion: ' 4.17.21 ',
      latestVersion: ' 4.17.22 ',
      homepage: ' https://lodash.com/ ',
      repositoryUrl: ' https://github.com/lodash/lodash ',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const entity = DependencyEntity.restore(props)
    const json = entity.toJSON()

    expect(json.name).toBe('Lodash')
    expect(json.version).toBe('^4.17.21')
    expect(json.ecosystem).toBe('npm')
    expect(json.packageManager).toBe('pnpm')
    expect(json.manifestPath).toBe('package.json')
    expect(json.installedVersion).toBe('4.17.21')
    expect(json.latestVersion).toBe('4.17.22')
    expect(json.homepage).toBe('https://lodash.com/')
    expect(json.repositoryUrl).toBe('https://github.com/lodash/lodash')
  })

  it('should be immutable (frozen)', () => {
    const entity = DependencyEntity.create(
      baseInput.name,
      baseInput.version,
      baseInput.ecosystem,
      baseInput.packageManager,
      baseInput.isDirect,
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
