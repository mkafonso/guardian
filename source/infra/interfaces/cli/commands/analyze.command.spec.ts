import { describe, expect, it } from 'vitest'
import { parseAnalyzeCommandOptions } from './analyze.command.options'

describe('parseAnalyzeCommandOptions', () => {
  it('should default to HTML output', () => {
    const options = parseAnalyzeCommandOptions([])

    expect(options.projectPath).toBe('.')
    expect(options.outputFormat).toBe('html')
    expect(options.outputPath).toBe('guardian-report.html')
    expect(options.outputToStdout).toBe(false)
    expect(options.jsonOutputPath).toBeUndefined()
  })

  it('should enable JSON stdout when --json is provided without a file', () => {
    const options = parseAnalyzeCommandOptions(['--json'])

    expect(options.outputFormat).toBe('json')
    expect(options.outputToStdout).toBe(true)
    expect(options.jsonOutputPath).toBeUndefined()
  })

  it('should write JSON to the provided file path', () => {
    const options = parseAnalyzeCommandOptions([
      '--json',
      '/tmp/guardian-report.json',
    ])

    expect(options.outputFormat).toBe('json')
    expect(options.outputToStdout).toBe(false)
    expect(options.jsonOutputPath).toBe('/tmp/guardian-report.json')
  })

  it('should use --output as JSON path when --json is set and no explicit json file path is provided', () => {
    const options = parseAnalyzeCommandOptions([
      '--json',
      '--output',
      '/tmp/guardian-report.json',
    ])

    expect(options.outputFormat).toBe('json')
    expect(options.outputToStdout).toBe(false)
    expect(options.jsonOutputPath).toBe('/tmp/guardian-report.json')
  })

  it('should keep the project path when provided before options', () => {
    const options = parseAnalyzeCommandOptions(['./my-app', '--json'])

    expect(options.projectPath).toBe('./my-app')
    expect(options.outputFormat).toBe('json')
  })
})
