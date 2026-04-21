import type { SecurityIncidentCardViewModel } from '../ports/report-template-renderer.port'
import type {
  SecurityIncidentRecord,
  SecurityIncidentSeverity,
} from '../ports/security-incidents-radar.port'

export type IncidentRadarMappingResult = {
  incidents: SecurityIncidentCardViewModel[]
  emergingPatterns: string[]
  actionableInsights: string[]
}

export class IncidentRadarMappingService {
  public execute(input: {
    incidents: SecurityIncidentRecord[]
    emergingPatterns: string[]
    actionableInsights: string[]
  }): IncidentRadarMappingResult {
    return {
      incidents: input.incidents.map((incident) => this.mapIncident(incident)),
      emergingPatterns: input.emergingPatterns,
      actionableInsights: input.actionableInsights,
    }
  }

  private mapIncident(
    incident: SecurityIncidentRecord,
  ): SecurityIncidentCardViewModel {
    return {
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      confidence: incident.confidence,
      badgeColor: this.resolveBadgeColor(incident.severity),
      affectedEcosystem: incident.affectedEcosystem,
      summary: incident.summary,
      occurredAt: incident.occurredAt,
      sourceURL: incident.sourceUrl,
      technicalVector: incident.technicalVector,
      realRisk: incident.realRisk,
      detectionSignal: incident.detectionSignal,
      recommendedAction: incident.recommendedAction,
    }
  }

  private resolveBadgeColor(severity: SecurityIncidentSeverity): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'secondary'
      case 'medium':
        return 'tertiary'
      default:
        return 'primary'
    }
  }
}
