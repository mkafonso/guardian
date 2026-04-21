import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type {
  ReachabilityAnalysisInput,
  ReachabilityAnalysisResult,
  ReachabilityAnalyzerPort,
  ReachabilityEvidence,
  ReachabilityFinding,
} from '../../core/ports/reachability-analyzer.port'

type DependencyMatcher = {
  name: string
  version: string
  regex: RegExp
}

export class SimpleReachabilityAnalyzerAdapter
  implements ReachabilityAnalyzerPort
{
  private readonly ignoredDirectoryNames = new Set([
    'node_modules',
    'dist',
    '.git',
    '.next',
    'coverage',
    '.turbo',
    '.cache',
    'build',
  ])

  private readonly allowedExtensions = new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
  ])

  public async analyze(
    input: ReachabilityAnalysisInput,
  ): Promise<ReachabilityAnalysisResult> {
    const matchers = input.dependencies.map((dep) => ({
      name: dep.name,
      version: dep.version,
      regex: this.buildDependencyUsageRegex(dep.name),
    }))

    const evidenceByKey = new Map<string, ReachabilityEvidence[]>()
    const reachableKeys = new Set<string>()

    for await (const filePath of this.walkProjectFiles(input.projectPath)) {
      if (reachableKeys.size === matchers.length) {
        break
      }

      const fileEvidence = await this.scanFileForDependencies(
        filePath,
        matchers,
      )
      for (const [key, evidence] of fileEvidence) {
        const existing = evidenceByKey.get(key) ?? []
        existing.push(...evidence)
        evidenceByKey.set(key, existing)
        reachableKeys.add(key)
      }
    }

    const findings: ReachabilityFinding[] = input.dependencies.map((dep) => {
      const key = this.buildKey(dep.name, dep.version)
      const evidence = evidenceByKey.get(key) ?? []
      const isReachable = evidence.length > 0

      return {
        dependencyName: dep.name,
        dependencyVersion: dep.version,
        isReachable,
        confidence: isReachable ? 'high' : 'unknown',
        evidence,
        notes: isReachable
          ? null
          : 'No import/require usage found in project files.',
      }
    })

    return { findings }
  }

  private async scanFileForDependencies(
    filePath: string,
    matchers: DependencyMatcher[],
  ): Promise<Map<string, ReachabilityEvidence[]>> {
    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile() || fileStat.size > 1_000_000) {
        return new Map()
      }

      const content = await readFile(filePath, 'utf8')
      const lines = content.split(/\r?\n/g)

      const found = new Map<string, ReachabilityEvidence[]>()

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex] ?? ''

        for (const matcher of matchers) {
          const key = this.buildKey(matcher.name, matcher.version)
          if (found.has(key)) {
            continue
          }

          const match = line.match(matcher.regex)
          if (!match) {
            continue
          }

          found.set(key, [
            {
              filePath,
              symbol: null,
              line: lineIndex + 1,
              snippet: line.trim() || null,
            },
          ])
        }
      }

      return found
    } catch {
      return new Map()
    }
  }

  private buildDependencyUsageRegex(packageName: string): RegExp {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const quoted = String.raw`['"\`]${escaped}(?:\/[^'"\`]*)?['"\`]`

    const patterns = [
      String.raw`\brequire\s*\(\s*${quoted}\s*\)`,
      String.raw`\bimport\s+[^;]+?\s+from\s*${quoted}`,
      String.raw`\bimport\s*\(\s*${quoted}\s*\)`,
      String.raw`\bexport\s+[^;]+?\s+from\s*${quoted}`,
    ]

    return new RegExp(patterns.join('|'), 'i')
  }

  private buildKey(name: string, version: string): string {
    return `${name}@${version}`
  }

  private async *walkProjectFiles(rootPath: string): AsyncGenerator<string> {
    const stack: string[] = [rootPath]

    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) {
        continue
      }

      let entries: Array<{
        name: string
        isDirectory: boolean
        isFile: boolean
      }>
      try {
        const dirEntries = await readdir(current, { withFileTypes: true })

        entries = dirEntries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }))
      } catch {
        continue
      }

      for (const entry of entries) {
        if (entry.isDirectory && entry.name.startsWith('.')) {
          continue
        }

        if (this.ignoredDirectoryNames.has(entry.name)) {
          continue
        }

        const fullPath = path.join(current, entry.name)

        if (entry.isDirectory) {
          stack.push(fullPath)
          continue
        }

        if (entry.isFile) {
          const ext = path.extname(entry.name)
          if (this.allowedExtensions.has(ext)) {
            yield fullPath
          }
        }
      }
    }
  }
}
