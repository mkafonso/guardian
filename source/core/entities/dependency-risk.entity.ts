import crypto from 'node:crypto'
import type { DependencyProps } from './dependency.entity'
import type { VulnerabilityProps } from './vulnerability.entity'

export type DependencyRiskProps = {
  id: string
  dependency: DependencyProps
  vulnerabilities: VulnerabilityProps[]
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  riskScore: number
  rationale: string
  hasFixAvailable: boolean
  recommendedVersion: string | null
  createdAt: Date
  updatedAt: Date
}

export class DependencyRiskEntity {
  private props: DependencyRiskProps

  private constructor(props: DependencyRiskProps) {
    this.props = Object.freeze({ ...props })
  }

  static create(
    dependency: DependencyProps,
    vulnerabilities: VulnerabilityProps[],
    riskLevel: DependencyRiskProps['riskLevel'],
    riskScore: number,
    rationale: string,
    hasFixAvailable: boolean,
    recommendedVersion: string | null = null,
  ): DependencyRiskEntity {
    const now = new Date()

    return new DependencyRiskEntity({
      id: crypto.randomUUID(),
      dependency: { ...dependency },
      vulnerabilities: vulnerabilities.map((item) => ({ ...item })),
      riskLevel,
      riskScore,
      rationale: rationale.trim(),
      hasFixAvailable,
      recommendedVersion: recommendedVersion?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(props: DependencyRiskProps): DependencyRiskEntity {
    return new DependencyRiskEntity({
      ...props,
      dependency: { ...props.dependency },
      vulnerabilities: props.vulnerabilities.map((item) => ({ ...item })),
      rationale: props.rationale.trim(),
      recommendedVersion: props.recommendedVersion?.trim() || null,
    })
  }

  toJSON(): DependencyRiskProps {
    return {
      ...this.props,
      dependency: { ...this.props.dependency },
      vulnerabilities: this.props.vulnerabilities.map((item) => ({ ...item })),
    }
  }

  get id(): string {
    return this.props.id
  }

  get dependency(): DependencyProps {
    return { ...this.props.dependency }
  }

  get vulnerabilities(): VulnerabilityProps[] {
    return this.props.vulnerabilities.map((item) => ({ ...item }))
  }

  get riskLevel(): DependencyRiskProps['riskLevel'] {
    return this.props.riskLevel
  }

  get riskScore(): number {
    return this.props.riskScore
  }

  get rationale(): string {
    return this.props.rationale
  }

  get hasFixAvailable(): boolean {
    return this.props.hasFixAvailable
  }

  get recommendedVersion(): string | null {
    return this.props.recommendedVersion
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
