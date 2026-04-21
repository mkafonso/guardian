#!/usr/bin/env node

import 'dotenv/config'

import { runCli } from './root'

async function bootstrap(): Promise<void> {
  try {
    await runCli(process.argv)
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Unexpected CLI error.'

    console.error(`guardian: ${message}`)
    process.exitCode = 1
  }
}

void bootstrap()
