import { describe, expect, it } from 'vitest'
import {
  AnalysisResultEntity,
  type AnalysisResultProps,
} from './analysis-result.entity'
import { DependencyRiskEntity } from './dependency-risk.entity'
import { DependencyEntity } from './dependency.entity'
import { UpgradeActionEntity } from './upgrade-action.entity'
import { VulnerabilityEntity } from './vulnerability.entity'

describe('AnalysisResultEntity', () => {
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

  const baseVulnerability = VulnerabilityEntity.create(
    ' GHSA-xxxx-yyyy-zzzz ',
    ' GitHub ',
    'high',
    7.4,
    ' Prototype Pollution ',
    '  Details here.  ',
    [' 4.17.21 ', ' '],
    [' https://github.com/advisories/GHSA-xxxx-yyyy-zzzz ', ' '],
  ).toJSON()

  const baseRisk = DependencyRiskEntity.create(
    baseDependency,
    [baseVulnerability],
    true,
    false,
    0.82,
    'high',
    '  vulnerable because...  ',
  ).toJSON()

  const baseAction = UpgradeActionEntity.create(
    baseDependency,
    ' ^4.17.21 ',
    ' ^4.17.22 ',
    'patch',
    '  low  ',
    '  pnpm up lodash  ',
    '  fixes vulnerabilities  ',
  ).toJSON()

  it('should create with trimmed summary and keep values', () => {
    const entity = AnalysisResultEntity.create(
      [baseDependency],
      [baseRisk],
      [baseAction],
      0.9,
      '  ok  ',
      123,
    )

    const json = entity.toJSON()

    expect(json.score).toBe(0.9)
    expect(json.summary).toBe('ok')
    expect(json.generatedAt).toBe(123)
    expect(json.dependencies).toEqual([baseDependency])
    expect(json.risks).toEqual([baseRisk])
    expect(json.actions).toEqual([baseAction])
  })

  it('should restore with trimmed summary', () => {
    const props: AnalysisResultProps = {
      dependencies: [baseDependency],
      risks: [baseRisk],
      actions: [baseAction],
      score: 0.42,
      summary: '  restored  ',
      generatedAt: 456,
    }

    const entity = AnalysisResultEntity.restore(props)
    expect(entity.summary).toBe('restored')
    expect(entity.score).toBe(0.42)
    expect(entity.generatedAt).toBe(456)
  })

  it('should not be affected by top-level input mutations', () => {
    const depInput = { ...baseDependency }
    const riskInput = { ...baseRisk }
    const actionInput = { ...baseAction }

    const entity = AnalysisResultEntity.create(
      [depInput],
      [riskInput],
      [actionInput],
      1,
      'summary',
      1,
    )

    depInput.name = 'hack'
    riskInput.summary = 'hack'
    actionInput.command = 'hack'

    const json = entity.toJSON()

    expect(json.dependencies[0]?.name).toBe('Lodash')
    expect(json.risks[0]?.summary).toBe('vulnerable because...')
    expect(json.actions[0]?.command).toBe('pnpm up lodash')
  })

  it('should return copies in toJSON and getters (no shared references)', () => {
    const entity = AnalysisResultEntity.create(
      [baseDependency],
      [baseRisk],
      [baseAction],
      0.9,
      'ok',
      123,
    )

    const a = entity.toJSON()
    const b = entity.toJSON()

    expect(a).not.toBe(b)
    expect(a.dependencies).not.toBe(b.dependencies)
    expect(a.risks).not.toBe(b.risks)
    expect(a.actions).not.toBe(b.actions)

    expect(a.dependencies[0]).not.toBe(b.dependencies[0])
    expect(a.risks[0]).not.toBe(b.risks[0])
    expect(a.actions[0]).not.toBe(b.actions[0])

    const depsA = entity.dependencies
    const depsB = entity.dependencies

    expect(depsA).not.toBe(depsB)
    expect(depsA[0]).not.toBe(depsB[0])

    depsA[0].name = 'hack'
    expect(entity.dependencies[0]?.name).toBe('Lodash')
  })

  it('should be immutable (frozen)', () => {
    const entity = AnalysisResultEntity.create(
      [baseDependency],
      [baseRisk],
      [baseAction],
      0.9,
      'ok',
      123,
    )

    const internal = (entity as unknown as { props: object }).props
    expect(Object.isFrozen(internal)).toBe(true)
  })
})
