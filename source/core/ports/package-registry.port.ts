export type PackageVersionMetadata = {
  version: string
  publishedAt: string | null
}

export type PackageRegistryMetadata = {
  name: string
  latestVersion: string | null
  deprecatedMessage: string | null
  homepageUrl: string | null
  repositoryUrl: string | null
  license: string | null
  publishedVersions: PackageVersionMetadata[]
}

export interface PackageRegistryPort {
  getPackageMetadata(pkgName: string): Promise<PackageRegistryMetadata>
  getPackagesMetadata(pkgNames: string[]): Promise<PackageRegistryMetadata[]>
}
