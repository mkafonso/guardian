import type { DependencyRiskProps } from './dependency-risk.entity'
import type { DependencyProps } from './dependency.entity'
import type { UpgradeActionProps } from './upgrade-action.entity'

export type AnalysisResultProps = {
  dependencies: DependencyProps[]
  risks: DependencyRiskProps[]
  actions: UpgradeActionProps[]
  score: number
  summary: string
  generatedAt: number
}

export class AnalysisResultEntity {
  private props: AnalysisResultProps

  private constructor(props: AnalysisResultProps) {
    this.props = Object.freeze({
      ...props,
      dependencies: props.dependencies.map((item) => ({ ...item })),
      risks: props.risks.map((item) => ({ ...item })),
      actions: props.actions.map((item) => ({ ...item })),
    })
  }

  static create(
    dependencies: DependencyProps[],
    risks: DependencyRiskProps[],
    actions: UpgradeActionProps[],
    score: number,
    summary: string,
    generatedAt: number,
  ): AnalysisResultEntity {
    return new AnalysisResultEntity({
      dependencies: dependencies.map((item) => ({ ...item })),
      risks: risks.map((item) => ({ ...item })),
      actions: actions.map((item) => ({ ...item })),
      score,
      summary: summary.trim(),
      generatedAt,
    })
  }

  static restore(props: AnalysisResultProps): AnalysisResultEntity {
    return new AnalysisResultEntity({
      ...props,
      dependencies: props.dependencies.map((item) => ({ ...item })),
      risks: props.risks.map((item) => ({ ...item })),
      actions: props.actions.map((item) => ({ ...item })),
      summary: props.summary.trim(),
    })
  }

  toJSON(): AnalysisResultProps {
    return {
      ...this.props,
      dependencies: this.props.dependencies.map((item) => ({ ...item })),
      risks: this.props.risks.map((item) => ({ ...item })),
      actions: this.props.actions.map((item) => ({ ...item })),
    }
  }

  get dependencies(): DependencyProps[] {
    return this.props.dependencies.map((item) => ({ ...item }))
  }

  get risks(): DependencyRiskProps[] {
    return this.props.risks.map((item) => ({ ...item }))
  }

  get actions(): UpgradeActionProps[] {
    return this.props.actions.map((item) => ({ ...item }))
  }

  get score(): number {
    return this.props.score
  }

  get summary(): string {
    return this.props.summary
  }

  get generatedAt(): number {
    return this.props.generatedAt
  }
}
