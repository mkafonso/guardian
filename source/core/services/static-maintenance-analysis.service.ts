import type {
  PackageConstraintsSnapshot,
  ProjectManifestSnapshot,
} from '../ports/project-manifest-reader.port'

export type StaticMaintenanceFindingCode =
  | 'react-without-typescript'
  | 'typescript-without-modern-runner'
  | 'eslint-prettier-overhead'
  | 'eslint-overhead'
  | 'tooling-complexity'
  | 'webpack-complexity'
  | 'babel-pipeline-complexity'
  | 'lodash-bundle-risk'
  | 'missing-core-scripts'
  | 'jest-without-test-script'
  | 'cross-env-not-needed'
  | 'missing-node-engine'
  | 'multiple-lockfiles'
  | 'manual-package-constraints'
  | 'redundant-dependencies'
  | 'dotenv-config-growth'
  | 'missing-license'

export type StaticMaintenanceFinding = {
  code: StaticMaintenanceFindingCode
  tag: string
  icon: string
  packageName: string
  description: string
  recommendation: string
  alternatives: string[]
  commands: string[]
}

export type StaticMaintenanceAnalysisInput = {
  dependencyNames: string[]
  manifest: ProjectManifestSnapshot | null
}

export class StaticMaintenanceAnalysisService {
  public handle(
    input: StaticMaintenanceAnalysisInput,
  ): StaticMaintenanceFinding[] {
    const dependencyNames = this.normalizeDependencyNames(input.dependencyNames)
    const dependencySet = this.buildDependencySet(dependencyNames)

    const findings: StaticMaintenanceFinding[] = []

    const usesReact = this.hasDependency(dependencySet, 'react')
    const usesTypeScript = this.hasDependency(dependencySet, 'typescript')
    const usesESLint = this.hasAnyDependency(dependencySet, [
      'eslint',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
    ])
    const usesPrettier = this.hasDependency(dependencySet, 'prettier')

    if (usesReact && !usesTypeScript) {
      findings.push(
        this.createFinding({
          code: 'react-without-typescript',
          tag: 'Type Safety',
          icon: 'security',
          packageName: 'react',
          description:
            'Seu projeto React não utiliza TypeScript. Em projetos que crescem, isso costuma aumentar bugs em runtime e dificultar refatorações seguras.',
          recommendation:
            'Se o time prioriza segurança e escala, considere adoção gradual de TypeScript.',
        }),
      )
    }

    if (usesESLint && usesPrettier) {
      findings.push(
        this.createFinding({
          code: 'eslint-prettier-overhead',
          tag: 'Tooling',
          icon: 'handyman',
          packageName: 'eslint + prettier',
          description:
            'Seu projeto usa ESLint e Prettier separados. Isso é comum, mas adiciona overhead de configuração e manutenção. Se o objetivo for simplificação, ferramentas como Biome podem consolidar lint + format.',
          recommendation:
            'Considere migrar para Biome para reduzir overhead e drift de config.',
          commands: [
            'npm i -D @biomejs/biome',
            'npx biome init && npx biome check .',
          ],
        }),
      )
    } else if (usesESLint) {
      findings.push(
        this.createFinding({
          code: 'eslint-overhead',
          tag: 'Tooling',
          icon: 'handyman',
          packageName: 'eslint',
          description:
            'Seu projeto usa ESLint. Se teu time valoriza setup mais rápido, menos peças móveis e menor overhead de tooling, consolide formatação + lint com o Biome.',
          recommendation: 'Use biome para reduzir overhead e drift de config.',
          commands: [
            'npm i -D @biomejs/biome',
            'npx biome init && npx biome check .',
          ],
        }),
      )
    }

    if (
      input.manifest &&
      this.shouldWarnToolingComplexity(
        dependencyNames,
        input.manifest.devDependenciesCount,
      )
    ) {
      findings.push(
        this.createFinding({
          code: 'tooling-complexity',
          tag: 'Tooling Complexity',
          icon: 'stacked_bar_chart',
          packageName: 'devDependencies',
          description:
            'Seu projeto possui um número elevado de dependências de tooling. Isso pode aumentar tempo de setup, CI e manutenção. Avalie se parte desse stack pode ser simplificada ou consolidada.',
          recommendation:
            'Considere reduzir/agrupar tooling redundante e padronizar o stack principal de build/lint/test.',
          alternatives: this.listToolingPackages(dependencyNames),
        }),
      )
    }

    if (this.hasDependency(dependencySet, 'webpack')) {
      findings.push(
        this.createFinding({
          code: 'webpack-complexity',
          tag: 'Build Tool',
          icon: 'build',
          packageName: 'webpack',
          description:
            'Webpack é poderoso, mas pode exigir configuração e manutenção maiores. Para projetos novos ou mais simples, alternativas como Vite oferecem setup mais rápido e menos complexidade.',
          recommendation:
            'Avalie migração gradual para Vite se o projeto permitir.',
        }),
      )
    }

    if (
      this.hasAnyDependency(dependencySet, [
        '@babel/core',
        'babel-core',
        'babel-loader',
      ]) ||
      this.hasDependencyPrefix(dependencyNames, '@babel/')
    ) {
      findings.push(
        this.createFinding({
          code: 'babel-pipeline-complexity',
          tag: 'Transpilation Stack',
          icon: 'swap_horiz',
          packageName: 'babel',
          description:
            'O uso de Babel junto com outras ferramentas pode indicar uma pipeline mais complexa. Em ambientes modernos, parte dessa necessidade pode ser substituída por ferramentas mais rápidas (esbuild, swc).',
          recommendation:
            'Reavalie se Babel ainda é necessário no pipeline atual e considere alternativas mais rápidas quando possível.',
        }),
      )
    }

    if (this.hasDependency(dependencySet, 'lodash')) {
      findings.push(
        this.createFinding({
          code: 'lodash-bundle-risk',
          tag: 'Bundle Optimization',
          icon: 'inventory_2',
          packageName: 'lodash',
          description:
            'lodash é útil, mas pode impactar bundle size se importado de forma ampla. Considere imports modulares ou uso de APIs nativas quando possível.',
          recommendation:
            'Prefira imports específicos (ex: lodash/isEqual) e valide tree-shaking; em alguns casos, troque por APIs nativas.',
        }),
      )
    }

    if (input.manifest) {
      const missingScripts = this.listMissingScripts(input.manifest.scripts)

      if (missingScripts.length > 0) {
        findings.push(
          this.createFinding({
            code: 'missing-core-scripts',
            tag: 'Project Maturity',
            icon: 'rule',
            packageName: 'scripts',
            description:
              'O package.json não define scripts essenciais como test, lint ou build. Isso pode indicar ausência de automações importantes no fluxo de desenvolvimento.',
            recommendation:
              'Defina scripts mínimos e padronize o uso no CI (test/lint/build).',
            alternatives: missingScripts,
          }),
        )
      }
    }

    if (this.hasDependency(dependencySet, 'jest') && input.manifest) {
      const testScript = this.normalizeText(input.manifest.scripts.test)

      if (!testScript || !testScript.includes('jest')) {
        findings.push(
          this.createFinding({
            code: 'jest-without-test-script',
            tag: 'Testing Consistency',
            icon: 'science',
            packageName: 'jest',
            description:
              'O projeto possui Jest como dependência, mas não há script de teste configurado. Isso pode indicar uso inconsistente ou abandono de testes.',
            recommendation:
              'Adicione ou ajuste o script "test" para executar Jest e integre no CI.',
          }),
        )
      }
    }

    if (this.hasDependency(dependencySet, 'cross-env')) {
      findings.push(
        this.createFinding({
          code: 'cross-env-not-needed',
          tag: 'Environment Compatibility',
          icon: 'public',
          packageName: 'cross-env',
          description:
            'cross-env é usado para compatibilidade entre sistemas. Em ambientes modernos (Node recente + containers), pode não ser mais necessário.',
          recommendation:
            'Reavalie a necessidade; se todos os ambientes são Linux/containers e Node recente, simplifique removendo o cross-env.',
        }),
      )
    }

    if (input.manifest) {
      const nodeEngine = this.normalizeText(input.manifest.engines.node)

      if (!nodeEngine) {
        findings.push(
          this.createFinding({
            code: 'missing-node-engine',
            tag: 'Runtime Consistency',
            icon: 'settings',
            packageName: 'node',
            description:
              'O projeto não define versão mínima do Node (engines). Isso pode gerar inconsistências entre ambientes (dev, CI, produção).',
            recommendation:
              'Defina engines.node e alinhe com a versão usada em CI/produção.',
          }),
        )
      }
    }

    if (input.manifest) {
      const lockfiles = this.listLockfiles(input.manifest)

      if (lockfiles.length > 1) {
        findings.push(
          this.createFinding({
            code: 'multiple-lockfiles',
            tag: 'Package Management',
            icon: 'inventory',
            packageName: 'tooling',
            description:
              'Há sinais de uso misto de ferramentas do ecossistema npm/yarn. Isso pode gerar inconsistência de lockfiles e instalação.',
            recommendation:
              'Padronize um package manager e mantenha apenas um lockfile no repositório.',
            alternatives: lockfiles,
          }),
        )
      }
    }

    if (input.manifest?.constraints) {
      const manualConstraints = this.listManualConstraints(
        input.manifest.constraints,
      )

      if (manualConstraints.length > 0) {
        findings.push(
          this.createFinding({
            code: 'manual-package-constraints',
            tag: 'warning',
            icon: 'warning',
            packageName: 'overrides/resolutions',
            description:
              'Você está forçando versões manualmente (resolutions/overrides). Isso pode quebrar libs silenciosamente, esconder vulnerabilidades reais e gerar comportamento inesperado em runtime.',
            recommendation:
              'Use com moderação: prefira atualizar a dependência raiz e remova overrides/resolutions quando possível.',
            alternatives: manualConstraints,
          }),
        )
      }
    }

    const redundantGroups = this.listRedundantDependencyGroups(dependencySet)
    if (redundantGroups.length > 0) {
      findings.push(
        this.createFinding({
          code: 'redundant-dependencies',
          tag: 'Redundancy',
          icon: 'content_copy',
          packageName: 'dependencies',
          description:
            'O projeto possui múltiplas dependências com responsabilidades semelhantes. Isso aumenta complexidade e pode confundir o padrão adotado pelo time.',
          recommendation:
            'Defina um padrão por responsabilidade (HTTP client, validation, date, etc.) e remova duplicadas quando possível.',
          alternatives: redundantGroups,
        }),
      )
    }

    if (this.hasDependency(dependencySet, 'dotenv')) {
      findings.push(
        this.createFinding({
          code: 'dotenv-config-growth',
          tag: 'Configuration',
          icon: 'tune',
          packageName: 'dotenv',
          description:
            'Uso de dotenv sugere configuração via .env. Em ambientes maiores, pode ser interessante evoluir para soluções mais robustas de gestão de configuração.',
          recommendation:
            'Padronize gestão de configuração (validação de schema, secrets manager, config por ambiente) quando o projeto escalar.',
        }),
      )
    }

    if (input.manifest && !this.normalizeText(input.manifest.license)) {
      findings.push(
        this.createFinding({
          code: 'missing-license',
          tag: 'Legal',
          icon: 'gavel',
          packageName: 'license',
          description:
            'O projeto não define uma licença. Isso pode gerar incertezas legais para uso e distribuição.',
          recommendation:
            'Defina o campo "license" no package.json conforme a política do projeto/empresa.',
        }),
      )
    }

    return this.sortFindings(findings)
  }

  private createFinding(
    input: Omit<StaticMaintenanceFinding, 'alternatives' | 'commands'> & {
      alternatives?: string[]
      commands?: string[]
    },
  ): StaticMaintenanceFinding {
    return {
      ...input,
      alternatives: [...(input.alternatives ?? [])],
      commands: [...(input.commands ?? [])],
    }
  }

  private normalizeDependencyNames(dependencyNames: string[]): string[] {
    return dependencyNames
      .map((item) => this.normalizeText(item))
      .filter((item): item is string => item.length > 0)
  }

  private buildDependencySet(dependencyNames: string[]): Set<string> {
    return new Set(dependencyNames)
  }

  private hasDependency(dependencySet: Set<string>, name: string): boolean {
    return dependencySet.has(this.normalizeText(name))
  }

  private hasAnyDependency(
    dependencySet: Set<string>,
    names: string[],
  ): boolean {
    return names.some((name) => this.hasDependency(dependencySet, name))
  }

  private hasDependencyPrefix(
    dependencyNames: string[],
    prefix: string,
  ): boolean {
    const normalizedPrefix = this.normalizeText(prefix)

    return dependencyNames.some((name) => name.startsWith(normalizedPrefix))
  }

  private listMissingScripts(scripts: Record<string, string>): string[] {
    const requiredScripts = ['test', 'lint', 'build']

    return requiredScripts.filter((scriptName) => {
      return !this.normalizeText(scripts[scriptName])
    })
  }

  private listLockfiles(manifest: ProjectManifestSnapshot): string[] {
    const lockfiles: string[] = []

    if (manifest.hasPackageLock) {
      lockfiles.push('package-lock.json')
    }

    if (manifest.hasYarnLock) {
      lockfiles.push('yarn.lock')
    }

    if (manifest.hasPnpmLock) {
      lockfiles.push('pnpm-lock.yaml')
    }

    return lockfiles
  }

  private listRedundantDependencyGroups(dependencySet: Set<string>): string[] {
    const groups = [
      ['axios', 'node-fetch', 'undici', 'got', 'superagent', 'cross-fetch'],
      ['moment', 'dayjs', 'date-fns', 'luxon'],
      ['joi', 'zod', 'yup', 'ajv'],
    ]

    const findings: string[] = []

    for (const group of groups) {
      const present = group
        .filter((dependencyName) => dependencySet.has(dependencyName))
        .sort((a, b) => a.localeCompare(b))

      if (present.length > 1) {
        findings.push(present.join(' + '))
      }
    }

    return findings.sort((a, b) => a.localeCompare(b)).slice(0, 12)
  }

  private listManualConstraints(
    constraints: PackageConstraintsSnapshot,
  ): string[] {
    const overrides = Object.entries(constraints.overrides)
      .map(([name, value]) => this.formatOverrideConstraint(name, value))
      .filter((value) => value.length > 0)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 12)

    const resolutions = Object.entries(constraints.resolutions)
      .map(([name, version]) => this.formatResolutionConstraint(name, version))
      .filter((value) => value.length > 0)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 12)

    return [...overrides, ...resolutions]
  }

  private formatOverrideConstraint(name: string, value: unknown): string {
    const normalizedName = name.trim()

    if (!normalizedName) {
      return ''
    }

    if (typeof value === 'string') {
      const version = value.trim()
      return version ? `overrides: ${normalizedName}@${version}` : ''
    }

    if (value && typeof value === 'object') {
      return `overrides: ${normalizedName}=${JSON.stringify(value)}`
    }

    const raw = String(value ?? '').trim()
    return raw ? `overrides: ${normalizedName}@${raw}` : ''
  }

  private formatResolutionConstraint(name: string, version: string): string {
    const normalizedName = name.trim()
    const normalizedVersion = version.trim()

    if (!normalizedName || !normalizedVersion) {
      return ''
    }

    return `resolutions: ${normalizedName}@${normalizedVersion}`
  }

  private shouldWarnToolingComplexity(
    dependencyNames: string[],
    devDependenciesCount: number,
  ): boolean {
    if (devDependenciesCount >= 45) {
      return true
    }

    const toolingCount = dependencyNames.filter((name) =>
      this.isToolingPackage(name),
    ).length

    return toolingCount >= 30
  }

  private listToolingPackages(dependencyNames: string[]): string[] {
    return dependencyNames
      .filter((name) => this.isToolingPackage(name))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 12)
  }

  private isToolingPackage(name: string): boolean {
    const normalizedName = this.normalizeText(name)

    if (!normalizedName) {
      return false
    }

    return (
      normalizedName.includes('eslint') ||
      normalizedName.includes('prettier') ||
      normalizedName.includes('webpack') ||
      normalizedName.includes('babel') ||
      normalizedName.includes('rollup') ||
      normalizedName.includes('vite') ||
      normalizedName.includes('ts-jest') ||
      normalizedName.includes('jest') ||
      normalizedName.includes('vitest') ||
      normalizedName.includes('swc') ||
      normalizedName.includes('esbuild') ||
      normalizedName.includes('loader') ||
      normalizedName.includes('plugin') ||
      normalizedName.includes('lint') ||
      normalizedName.includes('husky') ||
      normalizedName.includes('lint-staged') ||
      normalizedName.startsWith('@types/') ||
      normalizedName === 'typescript'
    )
  }

  private sortFindings(
    findings: StaticMaintenanceFinding[],
  ): StaticMaintenanceFinding[] {
    return findings
      .slice()
      .sort((left, right) => left.packageName.localeCompare(right.packageName))
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase()
  }
}
