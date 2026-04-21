import { runAnalyzeCommand } from './commands/analyze.command'

type CliCommand = 'analyze' | 'help' | 'version'

type ParsedCliInput = {
  command: CliCommand
  args: string[]
}

export async function runCli(argv: string[]): Promise<void> {
  const input = parseCliInput(argv)

  switch (input.command) {
    case 'analyze':
      await runAnalyzeCommand(input.args)
      return

    case 'version':
      printVersion()
      return

    case 'help':
    default:
      printHelp()
  }
}

function parseCliInput(argv: string[]): ParsedCliInput {
  const rawArgs = argv.slice(2)
  const [rawCommand, ...args] = rawArgs

  if (!rawCommand) {
    return {
      command: 'help',
      args: [],
    }
  }

  if (rawCommand === 'analyze') {
    return {
      command: 'analyze',
      args,
    }
  }

  if (rawCommand === '--help' || rawCommand === '-h' || rawCommand === 'help') {
    return {
      command: 'help',
      args,
    }
  }

  if (
    rawCommand === '--version' ||
    rawCommand === '-v' ||
    rawCommand === 'version'
  ) {
    return {
      command: 'version',
      args,
    }
  }

  throw new Error(`Unknown command "${rawCommand}". Use "guardian help".`)
}

function printHelp(): void {
  console.log(
    `
Guardian CLI

Usage:
  guardian analyze [projectPath] [options]
  guardian help
  guardian version

Commands:
  analyze        Analyze a Node.js project and generate an HTML report
  help           Show CLI help
  version        Show installed version

Analyze options:
  --output, -o <file>         Output HTML file path
  --no-incidents              Disable incidents radar
  --no-reachability           Disable reachability analysis

Examples:
  guardian analyze
  guardian analyze .
  guardian analyze ./my-app --output guardian-report.html
`.trim(),
  )
}

function printVersion(): void {
  try {
    const pkg = require('../../../../package.json') as { version?: string }

    console.log(pkg.version ?? '0.1.0')
  } catch {
    console.log('0.1.0')
  }
}
