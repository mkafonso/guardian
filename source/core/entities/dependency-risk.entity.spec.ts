import { describe, expect, it } from 'vitest'
import {
  DependencyRiskEntity,
  type DependencyRiskProps,
} from './dependency-risk.entity'
import { DependencyEntity } from './dependency.entity'
import { VulnerabilityEntity } from './vulnerability.entity'

describe('DependencyRiskEntity', () => {
  const baseDependency = DependencyEntity.create(
    ' Lodash ',
    ' ^4.17.21 ',
    ' NPM ',
    ' PNPM ',
    true,
    ' package.json ',
    ' 4.17.21 ',
    ' 4.17.22 ',
    ' https://lodash.com/ ',
    ' https://github.com/lodash/lodash ',
  ).toJSON()

  const baseVulnerability = VulnerabilityEntity.create(
    ' Lodash ',
    ' 4.17.21 ',
    ' GHSA-xxxx-yyyy-zzzz ',
    ' Prototype Pollution ',
    'high',
    '  Details here.  ',
    7.4,
    ' CVE-2020-8203 ',
    [' CWE-79 ', ' ', 'CWE-20'],
    ' <4.17.21 ',
    ' 4.17.21 ',
    ' https://github.com/advisories/GHSA-xxxx-yyyy-zzzz ',
    new Date('2020-01-01T00:00:00.000Z'),
    new Date('2020-02-01T00:00:00.000Z'),
  ).toJSON()

  it('should create a dependency risk with normalized values', () => {
    const entity = DependencyRiskEntity.create(
      baseDependency,
      [baseVulnerability],
      'high',
      0.82,
      '  vulnerable because...  ',
      true,
      ' 4.17.22 ',
    )

    const json = entity.toJSON()

    expect(json.id).toBeDefined()
    expect(json.dependency).toEqual(baseDependency)
    expect(json.vulnerabilities).toEqual([baseVulnerability])
    expect(json.riskLevel).toBe('high')
    expect(json.riskScore).toBe(0.82)
    expect(json.rationale).toBe('vulnerable because...')
    expect(json.hasFixAvailable).toBe(true)
    expect(json.recommendedVersion).toBe('4.17.22')
    expect(json.createdAt).toBeInstanceOf(Date)
    expect(json.updatedAt).toBeInstanceOf(Date)
    expect(json.createdAt).toBe(json.updatedAt)
  })

  it('should generate different ids', () => {
    const a = DependencyRiskEntity.create(
      baseDependency,
      [baseVulnerability],
      'high',
      0.82,
      'rationale',
      true,
    )

    const b = DependencyRiskEntity.create(
      baseDependency,
      [baseVulnerability],
      'high',
      0.82,
      'rationale',
      true,
    )

    expect(a.toJSON().id).not.toBe(b.toJSON().id)
  })

  it('should coerce recommendedVersion to null when blank', () => {
    const entity = DependencyRiskEntity.create(
      baseDependency,
      [baseVulnerability],
      'high',
      0.82,
      'rationale',
      true,
      '   ',
    )

    expect(entity.toJSON().recommendedVersion).toBeNull()
  })

  it('should restore with normalization', () => {
    const props: DependencyRiskProps = {
      id: 'id',
      dependency: { ...baseDependency, name: ' Lodash ' },
      vulnerabilities: [
        { ...baseVulnerability, title: ' Prototype Pollution ' },
      ],
      riskLevel: 'medium',
      riskScore: 0.5,
      rationale: '  because...  ',
      hasFixAvailable: false,
      recommendedVersion: ' 4.17.21 ',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const entity = DependencyRiskEntity.restore(props)
    const json = entity.toJSON()

    expect(json.rationale).toBe('because...')
    expect(json.recommendedVersion).toBe('4.17.21')
    expect(json.dependency.name).toBe(' Lodash ')
    expect(json.vulnerabilities[0]?.title).toBe(' Prototype Pollution ')
  })

  it('should return copies (dependency and vulnerabilities) and be immutable (frozen)', () => {
    const depInput = { ...baseDependency }
    const vulnInput = { ...baseVulnerability }

    const entity = DependencyRiskEntity.create(
      depInput,
      [vulnInput],
      'high',
      0.82,
      'rationale',
      true,
    )

    depInput.name = 'hack'
    vulnInput.title = 'hack'

    expect(entity.toJSON().dependency.name).toBe('Lodash')
    expect(entity.toJSON().vulnerabilities[0]?.title).toBe(
      'Prototype Pollution',
    )

    const dep = entity.dependency
    dep.name = 'hack'
    expect(entity.dependency.name).toBe('Lodash')

    const vulns = entity.vulnerabilities
    vulns.push({ ...baseVulnerability, title: 'hack' })
    vulns[0].title = 'hack'

    expect(entity.vulnerabilities).toHaveLength(1)
    expect(entity.vulnerabilities[0]?.title).toBe('Prototype Pollution')

    const internal = (entity as unknown as { props: object }).props
    expect(Object.isFrozen(internal)).toBe(true)
  })
})
