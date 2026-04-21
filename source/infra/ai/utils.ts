export function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function resolveOpenAIHttpError(
  status: number,
  rawBody: string,
): string {
  const body = parseJsonSafely(rawBody)

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'object' &&
    (body as { error?: unknown }).error !== null
  ) {
    const error = (body as { error: Record<string, unknown> }).error
    const message = typeof error.message === 'string' ? error.message : null

    if (message?.trim()) {
      return `OpenAI HTTP ${status}: ${message.trim()}`
    }
  }

  const trimmed = rawBody.trim()
  return trimmed ? `OpenAI HTTP ${status}: ${trimmed}` : `OpenAI HTTP ${status}`
}

export function extractOpenAIOutputText(body: unknown): string | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { output_text?: unknown }).output_text === 'string'
  ) {
    return (body as { output_text: string }).output_text
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as { output?: unknown }).output)
  ) {
    return null
  }

  const output = (body as { output: unknown[] }).output
  const parts: string[] = []

  for (const item of output) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !Array.isArray((item as { content?: unknown }).content)
    ) {
      continue
    }

    for (const content of (item as { content: unknown[] }).content) {
      if (typeof content !== 'object' || content === null) {
        continue
      }

      const text = (content as { text?: unknown }).text

      if (typeof text === 'string') {
        parts.push(text)
        continue
      }

      if (
        typeof text === 'object' &&
        text !== null &&
        typeof (text as { value?: unknown }).value === 'string'
      ) {
        parts.push((text as { value: string }).value)
      }
    }
  }

  const joined = parts.join('').trim()
  return joined ? joined : null
}

export function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function normalizeStringList(
  value: string[] | null | undefined,
  limit: number,
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const unique = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }

    const normalized = item.trim()

    if (!normalized) {
      continue
    }

    unique.add(normalized)

    if (unique.size >= limit) {
      break
    }
  }

  return [...unique]
}
