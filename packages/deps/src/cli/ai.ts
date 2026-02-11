import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

import { createCommand, exit } from '@nemo-cli/shared'
import { renderAiProgressViewer, renderRouteViewer } from '@nemo-cli/ui'
import { runAiAnalysis } from '../ai/runner.js'
import type { AiOutput } from '../core/types.js'

interface AiCliOptions {
  input?: string
  output?: string
  route?: string
  engine?: string
  model?: string
  maxSourceChars?: number | string
  fresh?: boolean
}

export function aiCommand() {
  return createCommand('ai')
    .description('Analyze page components with AI')
    .option('-i, --input <file>', 'Input AI dependency JSON file', './ai-docs/deps.ai.json')
    .option('-o, --output <dir>', 'Output directory for analysis results (default: <appRoot>/ai-docs)')
    .option('-r, --route <path>', 'Route to analyze (skip selector)')
    .option('--engine <engine>', 'AI engine (openai, google, zhipu, none)')
    .option('--model <name>', 'Model name')
    .option('--max-source-chars <number>', 'Max source chars per component', '12000')
    .option('--fresh', 'Ignore existing analysis results')
    .action(async (options: unknown) => {
      await handleAiCommand(toAiCliOptions(options))
    })
}

async function handleAiCommand(options: AiCliOptions): Promise<void> {
  const inputPath = resolvePath(options.input || './ai-docs/deps.ai.json')
  const fallbackPath = resolvePath('./deps.ai.json')
  const resolvedInputPath = existsSync(inputPath) ? inputPath : fallbackPath

  let content: string
  let aiOutput: AiOutput

  try {
    content = await readFile(resolvedInputPath, 'utf-8')
    aiOutput = JSON.parse(content) as AiOutput
  } catch (error) {
    console.error(`Error: Failed to read AI input file: "${resolvedInputPath}"`)
    console.error('Hint: Run `nd analyze <app-path> --format ai` first.')
    exit(1)
    return
  }

  const routes = Object.keys(aiOutput.pages)
  if (routes.length === 0) {
    console.error('Error: No pages found in AI output.')
    exit(1)
    return
  }

  const outputDir = options.output
    ? resolvePath(options.output)
    : resolvePath(aiOutput.meta?.appRoot ?? process.cwd(), 'ai-docs')

  let route = options.route
  if (!route) {
    route = await renderRouteViewer(routes)
  }

  if (!route) {
    console.error('Error: No route selected.')
    exit(1)
    return
  }

  if (!aiOutput.pages[route]) {
    console.error(`Error: Route "${route}" not found in AI output.`)
    exit(1)
    return
  }

  const maxSourceChars = Number(options.maxSourceChars)
  const resolvedMaxSourceChars = Number.isFinite(maxSourceChars) && maxSourceChars > 0 ? maxSourceChars : 12000

  await renderAiProgressViewer({
    title: `AI Analyze ${route}`,
    onStart: async (emit, signal) => {
      await runAiAnalysis(
        {
          aiOutput,
          route,
          outputDir,
          engine: options.engine,
          model: options.model,
          maxSourceChars: resolvedMaxSourceChars,
          resume: !options.fresh,
        },
        emit,
        signal
      )
    },
  })

  console.log(`AI analysis output written to: ${outputDir}`)
}

function toAiCliOptions(options: unknown): AiCliOptions {
  return options as AiCliOptions
}
