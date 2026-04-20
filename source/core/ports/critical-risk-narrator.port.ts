export type CriticalRiskNarrationInput = {
  packageName: string
  currentVersion: string
  targetVersion: string | null
  vulnerabilityId: string
  aliases: string[]
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown'
  cvss: number | null
  isReachable: boolean | null
  isExposed: boolean | null
  fixedIn: string[]
  references: Array<{
    url: string
    label: string
  }>
}

export type CriticalRiskNarration = {
  whyItMatters: string
  howItHappens: string
  impact: string
  action: string
  exploitSample: string | null
}

export interface CriticalRiskNarratorPort {
  narrate(input: CriticalRiskNarrationInput): Promise<CriticalRiskNarration>
}
