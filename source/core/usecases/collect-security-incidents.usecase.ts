import type { SecurityIncidentCardViewModel } from '../ports/report-template-renderer.port'
import type { SecurityIncidentsRadarPort } from '../ports/security-incidents-radar.port'
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
        limit: input.limit ?? 8,
      })

      const mapped = this.incidentRadarMappingService.execute({
        incidents: radarResult.incidents,
        emergingPatterns: radarResult.emergingPatterns,
        actionableInsights: radarResult.actionableInsights,
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

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message
    }

    return 'Não foi possível coletar o radar de incidentes no momento.'
  }
}
