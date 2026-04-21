import type {
  PackageRegistryMetadata,
  PackageRegistryPort,
  PackageVersionMetadata,
} from '../../core/ports/package-registry.port'

type NpmRegistryPackageResponse = {
  name?: unknown
  homepage?: unknown
  license?: unknown
  repository?: unknown
  'dist-tags'?: unknown
  time?: unknown
  versions?: unknown
}

type NpmRegistryRepository =
  | string
  | {
      type?: unknown
      url?: unknown
    }

export type NpmRegistryAdapterOptions = {
  baseUrl?: string
  timeoutMs?: number
  userAgent?: string
}

export class NpmRegistryAdapter implements PackageRegistryPort {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly userAgent: string

  constructor(options: NpmRegistryAdapterOptions = {}) {
    this.baseUrl = options.baseUrl?.trim() || 'https://registry.npmjs.org'
    this.timeoutMs = options.timeoutMs ?? 8_000
    this.userAgent = options.userAgent?.trim() || 'guardian/0.1'
  }

  public async getPackageMetadata(
    packageName: string,
  ): Promise<PackageRegistryMetadata> {
    const normalizedPackageName = packageName.trim()

    if (!normalizedPackageName) {
      throw new Error(
        'Nome do pacote é obrigatório para consultar o npm registry.',
      )
    }

    const url = `${this.baseUrl}/${encodeURIComponent(normalizedPackageName)}`
    const response = await this.fetchJson<NpmRegistryPackageResponse>(url)

    return this.mapPackageMetadata(response, normalizedPackageName)
  }

  public async getPackagesMetadata(
    packageNames: string[],
  ): Promise<PackageRegistryMetadata[]> {
    const uniqueNames = [
      ...new Set(packageNames.map((item) => item.trim()).filter(Boolean)),
    ]

    const results = await Promise.all(
      uniqueNames.map(async (packageName) => {
        try {
          return await this.getPackageMetadata(packageName)
        } catch {
          return {
            name: packageName,
            latestVersion: null,
            deprecatedMessage: null,
            homepageUrl: null,
            repositoryUrl: null,
            license: null,
            publishedVersions: [],
          } satisfies PackageRegistryMetadata
        }
      }),
    )

    return results
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`npm registry respondeu com status ${response.status}`)
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Falha ao consultar npm registry: ${error.message}`)
      }

      throw new Error('Falha ao consultar npm registry.')
    } finally {
      clearTimeout(timeout)
    }
  }

  private mapPackageMetadata(
    input: NpmRegistryPackageResponse,
    packageName: string,
  ): PackageRegistryMetadata {
    const distTags = this.readRecord(input['dist-tags'])
    const time = this.readRecord(input.time)
    const versions = this.readRecord(input.versions)
    const latestVersion = this.readString(distTags.latest)

    return {
      name: this.readString(input.name) ?? packageName,
      latestVersion,
      deprecatedMessage: this.resolveDeprecatedMessage(versions, latestVersion),
      homepageUrl: this.readString(input.homepage),
      repositoryUrl: this.resolveRepositoryUrl(input.repository),
      license: this.readString(input.license),
      publishedVersions: this.mapPublishedVersions(time),
    }
  }

  private resolveDeprecatedMessage(
    versions: Record<string, unknown>,
    latestVersion: string | null,
  ): string | null {
    if (!latestVersion) {
      return null
    }

    const latest = versions[latestVersion]
    if (!latest || typeof latest !== 'object' || Array.isArray(latest)) {
      return null
    }

    const record = latest as Record<string, unknown>
    return this.readString(record.deprecated)
  }

  private mapPublishedVersions(
    timeRecord: Record<string, unknown>,
  ): PackageVersionMetadata[] {
    return Object.entries(timeRecord)
      .filter(([key, value]) => {
        if (key === 'created' || key === 'modified') {
          return false
        }

        return typeof value === 'string' && value.trim().length > 0
      })
      .map(([version, publishedAt]) => ({
        version,
        publishedAt: String(publishedAt).trim(),
      }))
      .sort((left, right) => left.version.localeCompare(right.version))
  }

  private resolveRepositoryUrl(value: unknown): string | null {
    if (typeof value === 'string') {
      return value.trim() || null
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const repository = value as Extract<NpmRegistryRepository, object>
      if (typeof repository.url === 'string' && repository.url.trim()) {
        return repository.url.trim()
      }
    }

    return null
  }

  private readRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    return value as Record<string, unknown>
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }
}
