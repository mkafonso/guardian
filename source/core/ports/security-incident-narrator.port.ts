import type { SecurityIncidentRecord } from './security-incidents-radar.port'

export type SecurityIncidentNarration = {
  summary: string | null
  technicalVector: string | null
  realRisk: string | null
  detectionSignal: string | null
  recommendedAction: string | null
}

export type SecurityRadarNarration = {
  emergingPatterns: string[]
  actionableInsights: string[]
}

export interface SecurityIncidentNarratorPort {
  narrateIncident(input: {
    incident: SecurityIncidentRecord
  }): Promise<SecurityIncidentNarration>

  narrateRadar(input: {
    incidents: SecurityIncidentRecord[]
  }): Promise<SecurityRadarNarration>
}
