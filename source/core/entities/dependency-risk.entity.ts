import type { DependencyProps } from './dependency.entity'
import type { VulnerabilityProps } from './vulnerability.entity'

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

export type DependencyRiskProps = {
  dependency: DependencyProps
  vulnerabilities: VulnerabilityProps[]
  isReachable: boolean
  isExposed: boolean
  riskScore: number
  level: RiskLevel
  summary: string
}

export class DependencyRiskEntity {
  private props: DependencyRiskProps

  private constructor(props: DependencyRiskProps) {
    this.props = Object.freeze({
      ...props,
      dependency: { ...props.dependency },
      vulnerabilities: props.vulnerabilities.map((item) => ({ ...item })),
    })
  }

  static create(
    dependency: DependencyProps,
    vulnerabilities: VulnerabilityProps[],
    isReachable: boolean,
    isExposed: boolean,
    riskScore: number,
    level: RiskLevel,
    summary: string,
  ): DependencyRiskEntity {
    return new DependencyRiskEntity({
      dependency: { ...dependency },
      vulnerabilities: vulnerabilities.map((item) => ({ ...item })),
      isReachable,
      isExposed,
      riskScore,
      level,
      summary: summary.trim(),
    })
  }

  static restore(props: DependencyRiskProps): DependencyRiskEntity {
    return new DependencyRiskEntity({
      ...props,
      dependency: { ...props.dependency },
      vulnerabilities: props.vulnerabilities.map((item) => ({ ...item })),
      summary: props.summary.trim(),
    })
  }

  toJSON(): DependencyRiskProps {
    return {
      ...this.props,
      dependency: { ...this.props.dependency },
      vulnerabilities: this.props.vulnerabilities.map((item) => ({ ...item })),
    }
  }

  get dependency(): DependencyProps {
    return { ...this.props.dependency }
  }

  get vulnerabilities(): VulnerabilityProps[] {
    return this.props.vulnerabilities.map((item) => ({ ...item }))
  }

  get isReachable(): boolean {
    return this.props.isReachable
  }

  get isExposed(): boolean {
    return this.props.isExposed
  }

  get riskScore(): number {
    return this.props.riskScore
  }

  get level(): RiskLevel {
    return this.props.level
  }

  get summary(): string {
    return this.props.summary
  }
}
