import type { SecurityIncidentRecord } from '@/core/ports/security-incidents-radar.port'

export function buildSecurityIncidentNarrationPrompt(
  incident: SecurityIncidentRecord,
): string {
  return [
    'Você é um analista de segurança especializado no ecossistema Node.js, JavaScript, TypeScript, React e Next.js.',
    'Resuma o incidente abaixo em português do Brasil, com clareza e foco prático para times de engenharia.',
    'Não invente fatos. Se um campo não puder ser inferido com segurança, retorne null.',
    'Use no máximo 2 frases por campo.',
    '',
    'Incidente:',
    `- título: ${incident.title}`,
    `- tipo: ${incident.type}`,
    `- severidade: ${incident.severity}`,
    `- confiança: ${incident.confidence}`,
    `- ecossistemas afetados: ${incident.affectedEcosystem.join(', ') || 'não informado'}`,
    `- ocorreu em: ${incident.occurredAt ?? 'não informado'}`,
    `- fonte: ${incident.sourceUrl ?? 'não informada'}`,
    `- resumo bruto: ${incident.summary ?? 'não informado'}`,
    `- vetor técnico atual: ${incident.technicalVector ?? 'não informado'}`,
    `- risco real atual: ${incident.realRisk ?? 'não informado'}`,
    `- sinal de detecção atual: ${incident.detectionSignal ?? 'não informado'}`,
    `- ação recomendada atual: ${incident.recommendedAction ?? 'não informada'}`,
    '',
    'Retorne somente JSON válido.',
  ].join('\n')
}
