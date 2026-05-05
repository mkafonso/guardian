export type AnalyzeCommandOptions = {
  projectPath: string
  outputPath: string
  outputFormat: 'html' | 'json'
  jsonOutputPath?: string
  outputToStdout: boolean
  includeSecurityIncidents: boolean
  includeReachability: boolean
}

export function parseAnalyzeCommandOptions(
  args: string[],
): AnalyzeCommandOptions {
  let projectPath = '.'
  let outputPath = 'guardian-report.html'
  let outputPathExplicit = false
  let outputFormat: 'html' | 'json' = 'html'
  let jsonOutputPath: string | undefined
  let outputToStdout = false
  let includeSecurityIncidents = true
  let includeReachability = true

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (!arg) {
      continue
    }

    if (arg === '--no-incidents') {
      includeSecurityIncidents = false
      continue
    }

    if (arg === '--no-reachability') {
      includeReachability = false
      continue
    }

    if (arg === '--json') {
      outputFormat = 'json'
      const value = args[index + 1]

      if (value && !value.startsWith('-')) {
        jsonOutputPath = value
        index += 1
      } else {
        outputToStdout = true
      }

      continue
    }

    if (arg === '--output' || arg === '-o') {
      const value = args[index + 1]

      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --output option.')
      }

      outputPath = value
      outputPathExplicit = true
      index += 1
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}".`)
    }

    projectPath = arg
  }

  if (
    outputFormat === 'json' &&
    jsonOutputPath === undefined &&
    outputPathExplicit
  ) {
    jsonOutputPath = outputPath
    outputToStdout = false
  }

  return {
    projectPath,
    outputPath,
    outputFormat,
    jsonOutputPath,
    outputToStdout,
    includeSecurityIncidents,
    includeReachability,
  }
}
