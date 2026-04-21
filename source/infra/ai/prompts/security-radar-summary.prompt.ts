import type { SecurityIncidentRecord } from '@/core/ports/security-incidents-radar.port'

export function buildSecurityRadarSummaryPrompt(
  incidents: SecurityIncidentRecord[],
): string {
  const normalizedIncidents = incidents.slice(0, 6)

  const incidentsBlock = normalizedIncidents
    .map((incident, index) => {
      return [
        `Incidente ${index + 1}:`,
        `- título: ${incident.title}`,
        `- tipo: ${incident.type}`,
        `- severidade: ${incident.severity}`,
        `- confiança: ${incident.confidence}`,
        `- ecossistemas: ${incident.affectedEcosystem.join(', ') || 'não informado'}`,
        `- data: ${incident.occurredAt ?? 'não informado'}`,
        `- fonte: ${incident.sourceUrl ?? 'não informada'}`,
        `- resumo: ${incident.summary ?? 'não informado'}`,
        `- vetor: ${incident.technicalVector ?? 'não informado'}`,
        `- risco real: ${incident.realRisk ?? 'não informado'}`,
        `- sinal: ${incident.detectionSignal ?? 'não informado'}`,
        `- ação: ${incident.recommendedAction ?? 'não informada'}`,
      ].join('\n')
    })
    .join('\n\n')

  return [
    'Você é um analista de segurança especializado no ecossistema Node.js, JavaScript, TypeScript, React e Next.js.',
    'Analise os incidentes abaixo e produza um radar executivo em português do Brasil.',
    'Não invente fatos. Seja direto e útil.',
    'Retorne no máximo 4 padrões emergentes e 4 insights acionáveis.',
    '',
    incidentsBlock,
    '',
    'Retorne somente JSON válido.',
  ].join('\n')
}
