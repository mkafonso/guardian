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
    ' 4.17.22 ',
    'direct',
    ' PNPM ',
    ' package.json ',
    false,
    null,
    null,
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

  it('should create a dependency risk with normalized values', () => {
    const entity = DependencyRiskEntity.create(
      baseDependency,
      [baseVulnerability],
      true,
      false,
      0.82,
      'high',
      '  vulnerable because...  ',
    )

    const json = entity.toJSON()

    expect(json.dependency).toEqual(baseDependency)
    expect(json.vulnerabilities).toEqual([baseVulnerability])
    expect(json.isReachable).toBe(true)
    expect(json.isExposed).toBe(false)
    expect(json.riskScore).toBe(0.82)
    expect(json.level).toBe('high')
    expect(json.summary).toBe('vulnerable because...')
  })

  it('should restore with normalization', () => {
    const props: DependencyRiskProps = {
      dependency: { ...baseDependency },
      vulnerabilities: [
        { ...baseVulnerability, title: ' Prototype Pollution ' },
      ],
      isReachable: false,
      isExposed: true,
      riskScore: 0.5,
      level: 'medium',
      summary: '  because...  ',
    }

    const entity = DependencyRiskEntity.restore(props)
    const json = entity.toJSON()

    expect(json.summary).toBe('because...')
    expect(json.isReachable).toBe(false)
    expect(json.isExposed).toBe(true)
    expect(json.level).toBe('medium')
    expect(json.vulnerabilities[0]?.title).toBe(' Prototype Pollution ')
  })

  it('should return copies (dependency and vulnerabilities) and be immutable (frozen)', () => {
    const depInput = { ...baseDependency }
    const vulnInput = { ...baseVulnerability }

    const entity = DependencyRiskEntity.create(
      depInput,
      [vulnInput],
      true,
      false,
      0.82,
      'high',
      'summary',
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

    const a = entity.toJSON()
    const b = entity.toJSON()

    expect(a).not.toBe(b)
    expect(a.dependency).not.toBe(b.dependency)
    expect(a.vulnerabilities).not.toBe(b.vulnerabilities)

    const internal = (entity as unknown as { props: object }).props
    expect(Object.isFrozen(internal)).toBe(true)
  })
})
