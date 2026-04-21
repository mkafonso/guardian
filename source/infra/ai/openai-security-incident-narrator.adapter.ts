import type {
  SecurityIncidentNarration,
  SecurityIncidentNarratorPort,
  SecurityRadarNarration,
} from '@/core/ports/security-incident-narrator.port'
import type { SecurityIncidentRecord } from '@/core/ports/security-incidents-radar.port'
import { buildSecurityIncidentNarrationPrompt } from '@/infra/ai/prompts/security-incident-narration.prompt'
import { buildSecurityRadarSummaryPrompt } from '@/infra/ai/prompts/security-radar-summary.prompt'
import {
  extractOpenAIOutputText,
  normalizeNullableText,
  normalizeStringList,
  parseJsonSafely,
  resolveOpenAIHttpError,
} from '@/infra/ai/utils'

export type OpenAISecurityIncidentNarratorAdapterOptions = {
  apiKey: string
  model?: string
  maxRetries?: number
}

type IncidentNarrationSchema = {
  summary: string | null
  technicalVector: string | null
  realRisk: string | null
  detectionSignal: string | null
  recommendedAction: string | null
}

type RadarNarrationSchema = {
  emergingPatterns: string[]
  actionableInsights: string[]
}

export class OpenAISecurityIncidentNarratorAdapter
  implements SecurityIncidentNarratorPort
{
  private readonly apiKey: string
  private readonly model: string
  private readonly maxRetries: number

  constructor(options: OpenAISecurityIncidentNarratorAdapterOptions) {
    this.apiKey = options.apiKey
    this.model = options.model ?? 'gpt-4o-mini'
    this.maxRetries = options.maxRetries ?? 2
  }

  public async narrateIncident(input: {
    incident: SecurityIncidentRecord
  }): Promise<SecurityIncidentNarration> {
    const prompt = buildSecurityIncidentNarrationPrompt(input.incident)

    const parsed = await this.withRetry(async () => {
      return this.requestJson<IncidentNarrationSchema>({
        prompt,
        schemaName: 'security_incident_narration',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: ['string', 'null'] },
            technicalVector: { type: ['string', 'null'] },
            realRisk: { type: ['string', 'null'] },
            detectionSignal: { type: ['string', 'null'] },
            recommendedAction: { type: ['string', 'null'] },
          },
          required: [
            'summary',
            'technicalVector',
            'realRisk',
            'detectionSignal',
            'recommendedAction',
          ],
        },
      })
    })

    return {
      summary: normalizeNullableText(parsed.summary),
      technicalVector: normalizeNullableText(parsed.technicalVector),
      realRisk: normalizeNullableText(parsed.realRisk),
      detectionSignal: normalizeNullableText(parsed.detectionSignal),
      recommendedAction: normalizeNullableText(parsed.recommendedAction),
    }
  }

  public async narrateRadar(input: {
    incidents: SecurityIncidentRecord[]
  }): Promise<SecurityRadarNarration> {
    const prompt = buildSecurityRadarSummaryPrompt(input.incidents)

    const parsed = await this.withRetry(async () => {
      return this.requestJson<RadarNarrationSchema>({
        prompt,
        schemaName: 'security_radar_narration',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            emergingPatterns: {
              type: 'array',
              items: { type: 'string' },
            },
            actionableInsights: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['emergingPatterns', 'actionableInsights'],
        },
      })
    })

    return {
      emergingPatterns: normalizeStringList(parsed.emergingPatterns, 4),
      actionableInsights: normalizeStringList(parsed.actionableInsights, 4),
    }
  }

  private async requestJson<T>(input: {
    prompt: string
    schemaName: string
    schema: Record<string, unknown>
  }): Promise<T> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: input.prompt,
        text: {
          format: {
            type: 'json_schema',
            name: input.schemaName,
            schema: input.schema,
          },
        },
      }),
    })

    const rawBody = await response.text()

    if (!response.ok) {
      throw new Error(resolveOpenAIHttpError(response.status, rawBody))
    }

    const parsedBody = parseJsonSafely(rawBody)
    const output = extractOpenAIOutputText(parsedBody)?.trim()

    if (!output) {
      throw new Error('OpenAI returned an empty structured response.')
    }

    return JSON.parse(output) as T
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (attempt === this.maxRetries) {
          break
        }

        await this.sleep(this.resolveBackoffMs(attempt))
      }
    }

    throw this.resolveNarrationError(lastError)
  }

  private resolveBackoffMs(attempt: number): number {
    return 400 * (attempt + 1)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  private resolveNarrationError(error: unknown): Error {
    if (error instanceof Error && error.message.trim()) {
      return new Error(
        `Failed to narrate security incidents with OpenAI: ${error.message}`,
      )
    }

    return new Error('Failed to narrate security incidents with OpenAI.')
  }
}
