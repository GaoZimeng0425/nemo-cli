import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

import type { AiProviderEngine } from '@nemo-cli/ai'
import { createCommand, exit } from '@nemo-cli/shared'
import { renderAiProgressViewer, renderRouteViewer } from '@nemo-cli/ui'
import { runAiAnalysis } from '../ai/runner'
import type { AiOutput } from '../core/types'
import { resolveWorkspaceProjectPath } from './project-resolver'

interface AiCliOptions {
  input?: string
  output?: string
  route?: string
  engine?: AiProviderEngine
  model?: string
  maxSourceChars?: number | string
  fresh?: boolean
}

export function aiCommand() {
  return createCommand('ai')
    .description('Analyze page components with AI')
    .argument('[path]', 'App path, src path, or monorepo root', '.')
    .option('-i, --input <file>', 'Input AI dependency JSON file (default: <appRoot>/ai-docs/deps.ai.json)')
    .option('-o, --output <dir>', 'Output directory for analysis results (default: <appRoot>/ai-docs)')
    .option('-r, --route <path>', 'Route to analyze (skip selector, comma-separated for multiple)')
    .option('--engine <engine>', 'AI engine (openai, google, zhipu, none)')
    .option('--model <name>', 'Model name')
    .option('--max-source-chars <number>', 'Max source chars per component', '12000')
    .option('--fresh', 'Ignore existing analysis results')
    .action(async (path: string, options: AiCliOptions) => {
      await handleAiCommand(path, toAiCliOptions(options))
    })
}

async function handleAiCommand(targetPath: string, options: AiCliOptions): Promise<void> {
  const appRoot = await resolveWorkspaceProjectPath({
    targetPath,
    selectMessage: 'Select app to analyze',
    isCandidate: isAiCandidate,
  })
  const resolvedInputPath = resolveInputPath(options.input, appRoot)

  let content: string
  let aiOutput: AiOutput

  try {
    content = await readFile(resolvedInputPath, 'utf-8')
    aiOutput = JSON.parse(content) as AiOutput
  } catch (error) {
    console.error(`Error: Failed to read AI input file: "${resolvedInputPath}"`)
    console.error(`Hint: Run \`nd analyze ${appRoot} --format ai\` first.`)
    exit(1)
    return
  }

  const routes = Array.from(new Set(Object.keys(aiOutput.pages)))
  if (routes.length === 0) {
    console.error('Error: No pages found in AI output.')
    exit(1)
    return
  }

  const outputDir = options.output ? resolvePath(options.output) : resolvePath(appRoot, 'ai-docs')

  const selectedRoutesFromOption = parseRouteOption(options.route)
  const selectedRoutes =
    selectedRoutesFromOption.length > 0 ? selectedRoutesFromOption : await renderRouteViewer(routes)

  if (!selectedRoutes || selectedRoutes.length === 0) {
    console.error('Error: No route selected.')
    exit(1)
    return
  }

  const missingRoutes = selectedRoutes.filter((route) => !aiOutput.pages[route])
  if (missingRoutes.length > 0) {
    console.error(`Error: Route(s) not found in AI output: ${missingRoutes.join(', ')}`)
    exit(1)
    return
  }

  const maxSourceChars = Number(options.maxSourceChars)
  const resolvedMaxSourceChars = Number.isFinite(maxSourceChars) && maxSourceChars > 0 ? maxSourceChars : 12000

  for (const route of selectedRoutes) {
    await renderAiProgressViewer({
      title: `AI Analyze ${route}`,
      onStart: async (emit, signal) => {
        await runAiAnalysis(
          {
            aiOutput,
            route,
            outputDir,
            engine: options.engine ?? 'zhipu',
            model: options.model,
            maxSourceChars: resolvedMaxSourceChars,
            resume: !options.fresh,
          },
          emit,
          signal
        )
      },
    })
  }

  console.log(`AI analysis output written to: ${outputDir}`)
}

function toAiCliOptions(options: unknown): AiCliOptions {
  return options as AiCliOptions
}

function parseRouteOption(routeOption?: string): string[] {
  if (!routeOption) return []
  return Array.from(
    new Set(
      routeOption
        .split(',')
        .map((route) => route.trim())
        .filter(Boolean)
    )
  )
}

function resolveInputPath(inputOption: string | undefined, appRoot: string): string {
  if (inputOption) {
    return resolvePath(inputOption)
  }

  const preferred = resolvePath(appRoot, 'ai-docs', 'deps.ai.json')
  if (existsSync(preferred)) {
    return preferred
  }

  const fallback = resolvePath(appRoot, 'deps.ai.json')
  if (existsSync(fallback)) {
    return fallback
  }

  return preferred
}

function isAiCandidate(path: string): boolean {
  if (!existsSync(resolvePath(path, 'package.json'))) {
    return false
  }

  if (existsSync(resolvePath(path, 'app'))) {
    return true
  }

  if (existsSync(resolvePath(path, 'src', 'app'))) {
    return true
  }

  if (existsSync(resolvePath(path, 'ai-docs', 'deps.ai.json')) || existsSync(resolvePath(path, 'deps.ai.json'))) {
    return true
  }

  return false
}
