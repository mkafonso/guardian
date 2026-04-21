import type { SecurityIncidentCardViewModel } from '../ports/report-template-renderer.port'
import type { SecurityIncidentNarratorPort } from '../ports/security-incident-narrator.port'
import type {
  SecurityIncidentRecord,
  SecurityIncidentsRadarPort,
} from '../ports/security-incidents-radar.port'
import { IncidentRadarMappingService } from '../services/incident-radar-mapping.service'

export type CollectSecurityIncidentsInput = {
  dependencyNames: string[]
  ecosystem?: 'npm' | 'node' | 'javascript' | 'typescript'
  limit?: number
}

export type CollectSecurityIncidentsOutput = {
  incidents: SecurityIncidentCardViewModel[]
  emergingPatterns: string[]
  actionableInsights: string[]
  error: string | null
}

export class CollectSecurityIncidentsUseCase {
  constructor(
    private readonly incidentRadarMappingService: IncidentRadarMappingService,
    private readonly securityIncidentsRadar?: SecurityIncidentsRadarPort,
    private readonly securityIncidentNarrator?: SecurityIncidentNarratorPort,
  ) {}

  public async execute(
    input: CollectSecurityIncidentsInput,
  ): Promise<CollectSecurityIncidentsOutput> {
    if (!this.securityIncidentsRadar) {
      return {
        incidents: [],
        emergingPatterns: [],
        actionableInsights: [],
        error: null,
      }
    }

    try {
      const radarResult = await this.securityIncidentsRadar.collect({
        ecosystem: input.ecosystem ?? 'npm',
        projectDependencies: input.dependencyNames,
        limit: input.limit ?? 6,
      })

      const enrichedRadarResult = await this.enrichRadarResult(radarResult)

      const mapped = this.incidentRadarMappingService.execute({
        incidents: enrichedRadarResult.incidents,
        emergingPatterns: enrichedRadarResult.emergingPatterns,
        actionableInsights: enrichedRadarResult.actionableInsights,
      })

      return {
        incidents: mapped.incidents,
        emergingPatterns: mapped.emergingPatterns,
        actionableInsights: mapped.actionableInsights,
        error: null,
      }
    } catch (error) {
      return {
        incidents: [],
        emergingPatterns: [],
        actionableInsights: [],
        error: this.resolveErrorMessage(error),
      }
    }
  }

  private async enrichRadarResult(input: {
    incidents: SecurityIncidentRecord[]
    emergingPatterns: string[]
    actionableInsights: string[]
  }) {
    const narrator = this.securityIncidentNarrator

    if (!narrator) {
      return input
    }

    const incidents = await Promise.all(
      input.incidents.map(async (incident) => {
        const needsNarration =
          !incident.summary ||
          !incident.technicalVector ||
          !incident.realRisk ||
          !incident.detectionSignal ||
          !incident.recommendedAction

        if (!needsNarration) {
          return incident
        }

        const narration = await narrator.narrateIncident({
          incident,
        })

        return {
          ...incident,
          summary: incident.summary ?? narration.summary,
          technicalVector:
            incident.technicalVector ?? narration.technicalVector,
          realRisk: incident.realRisk ?? narration.realRisk,
          detectionSignal:
            incident.detectionSignal ?? narration.detectionSignal,
          recommendedAction:
            incident.recommendedAction ?? narration.recommendedAction,
        }
      }),
    )

    let emergingPatterns = input.emergingPatterns
    let actionableInsights = input.actionableInsights

    const needsRadarNarration =
      emergingPatterns.length === 0 || actionableInsights.length === 0

    if (needsRadarNarration) {
      const radarNarration = await narrator.narrateRadar({
        incidents,
      })

      if (emergingPatterns.length === 0) {
        emergingPatterns = radarNarration.emergingPatterns
      }

      if (actionableInsights.length === 0) {
        actionableInsights = radarNarration.actionableInsights
      }
    }

    return {
      incidents,
      emergingPatterns,
      actionableInsights,
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message
    }

    return 'Não foi possível coletar o radar de incidentes no momento.'
  }
}
