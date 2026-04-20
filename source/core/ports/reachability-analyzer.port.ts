export type ReachabilityEvidence = {
  filePath: string
  symbol: string | null
  line: number | null
  snippet: string | null
}

export type ReachabilityFinding = {
  dependencyName: string
  dependencyVersion: string
  isReachable: boolean
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  evidence: ReachabilityEvidence[]
  notes: string | null
}

export type ReachabilityAnalysisInput = {
  projectPath: string
  dependencies: Array<{
    name: string
    version: string
  }>
}

export type ReachabilityAnalysisResult = {
  findings: ReachabilityFinding[]
}

export interface ReachabilityAnalyzerPort {
  analyze(input: ReachabilityAnalysisInput): Promise<ReachabilityAnalysisResult>
}
