export type SecurityIncidentSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'

export type SecurityIncidentType =
  | 'supply-chain'
  | 'malware'
  | 'account-takeover'
  | 'typosquatting'
  | 'registry-abuse'
  | 'token-leak'
  | 'ecosystem-alert'
  | 'other'

export type SecurityIncidentRecord = {
  title: string
  type: SecurityIncidentType
  severity: SecurityIncidentSeverity
  confidence: 'high' | 'medium' | 'low'
  affectedEcosystem: string[]
  summary: string | null
  occurredAt: string | null
  sourceUrl: string | null
  technicalVector: string | null
  realRisk: string | null
  detectionSignal: string | null
  recommendedAction: string | null
}

export type SecurityIncidentsRadarInput = {
  ecosystem: 'npm' | 'node' | 'javascript' | 'typescript'
  projectDependencies: string[]
  limit?: number
}

export type SecurityIncidentsRadarResult = {
  incidents: SecurityIncidentRecord[]
  emergingPatterns: string[]
  actionableInsights: string[]
}

export interface SecurityIncidentsRadarPort {
  collect(
    input: SecurityIncidentsRadarInput,
  ): Promise<SecurityIncidentsRadarResult>
}
