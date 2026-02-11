import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createZhipu, zhipu } from 'zhipu-ai-provider'

import type { AiProgressUpdate } from '@nemo-cli/ui'
import type { AiNode, AiOutput, AiPage, NodeScope } from '../core/types.js'

export type AiEngine = 'openai' | 'google' | 'zhipu' | 'none'

export interface AiRunOptions {
  aiOutput: AiOutput
  route: string
  outputDir: string
  engine?: AiEngine
  model?: string
  maxSourceChars?: number
  resume?: boolean
}

type AnalysisStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

interface ComponentAnalysisFile {
  id: string
  routes: string[]
  scope: NodeScope
  path?: string
  relativePath?: string
  dependencies: string[]
  dependents: string[]
  analysis: {
    status: AnalysisStatus
    summary?: string
    content?: string
    model?: string
    engine?: AiEngine
    promptVersion: string
    sourceHash?: string
    updatedAt: string
    error?: string
  }
}

interface PageIndexFile {
  route: string
  entryFile: string
  layoutChain: string[]
  total: number
  completed: number
  skipped: number
  errors: number
  updatedAt: string
}

const DEFAULT_MAX_SOURCE_CHARS = 12000
const PROMPT_VERSION = 'v1'

export async function runAiAnalysis(
  options: AiRunOptions,
  emit: (update: AiProgressUpdate) => void,
  signal: AbortSignal
): Promise<void> {
  const { aiOutput, route, outputDir } = options
  const page = aiOutput.pages[route]

  if (!page) {
    throw new Error(`Route not found in AI output: ${route}`)
  }

  const nodeIds = getOrderedNodeIds(page)
  const total = nodeIds.length

  let completed = 0
  let skipped = 0
  let errors = 0

  emit({ total, completed, status: 'pending', current: 'Preparing analysis...' })

  for (const nodeId of nodeIds) {
    if (signal.aborted) {
      break
    }

    const node = aiOutput.nodes[nodeId]
    if (!node) {
      completed += 1
      emit({
        total,
        completed,
        status: 'skipped',
        current: nodeId,
        message: `Skipped missing node: ${shortName(nodeId)}`,
      })
      continue
    }

    const outputPath = getComponentOutputPath(outputDir, node)
    const existing = await readJsonSafe<ComponentAnalysisFile>(outputPath)

    const sourceContent = await readSourceContent(node)
    const sourceHash = sourceContent ? hashContent(sourceContent) : undefined

    if (
      options.resume !== false &&
      existing?.analysis?.status === 'done' &&
      existing.analysis.sourceHash === sourceHash
    ) {
      const updated = ensureRouteRecorded(existing, route)
      if (updated) {
        await writeJson(outputPath, updated)
      }
      completed += 1
      skipped += 1
      emit({
        total,
        completed,
        status: 'skipped',
        current: nodeId,
        message: `Skipped unchanged: ${shortName(nodeId)}`,
      })
      continue
    }

    emit({
      total,
      completed,
      status: 'running',
      current: nodeId,
      message: `Analyzing: ${shortName(nodeId)}`,
    })

    const analysis = await analyzeNode({
      node,
      page,
      aiOutput,
      outputDir,
      sourceContent,
      sourceHash,
      engine: options.engine,
      model: options.model,
      maxSourceChars: options.maxSourceChars ?? DEFAULT_MAX_SOURCE_CHARS,
      existing,
    })

    await writeJson(outputPath, analysis)

    completed += 1
    if (analysis.analysis.status === 'skipped') {
      skipped += 1
    } else if (analysis.analysis.status === 'error') {
      errors += 1
    }

    emit({
      total,
      completed,
      status: analysis.analysis.status,
      current: nodeId,
      message: `${analysis.analysis.status}: ${shortName(nodeId)}`,
    })
  }

  await writeJson(getPageIndexPath(outputDir, route), {
    route: page.route,
    entryFile: page.entryFile,
    layoutChain: page.layoutChain,
    total,
    completed,
    skipped,
    errors,
    updatedAt: new Date().toISOString(),
  } satisfies PageIndexFile)
}

function getOrderedNodeIds(page: AiPage): string[] {
  const ordered = page.orderGroups && page.orderGroups.length > 0 ? page.orderGroups.flat() : page.nodeIds
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ordered) {
    if (!seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}

function shortName(nodeId: string): string {
  const parts = nodeId.split('/')
  return parts[parts.length - 1] || nodeId
}

function routeToDir(route: string): string {
  if (route === '/') return '_'
  return route.replace(/^\//, '')
}

function getComponentOutputPath(outputDir: string, node: AiNode): string {
  const baseDir = resolvePath(outputDir, 'components')

  if (!isAbsolute(node.id)) {
    return resolvePath(baseDir, 'external', `${sanitizePath(node.id)}.json`)
  }

  if (node.relativePath && !isAbsolute(node.relativePath)) {
    return resolvePath(baseDir, `${sanitizePath(node.relativePath)}.json`)
  }

  return resolvePath(baseDir, `${sanitizePath(node.id)}.json`)
}

function getPageIndexPath(outputDir: string, route: string): string {
  return resolvePath(outputDir, 'pages', routeToDir(route), 'page.json')
}

function sanitizePath(value: string): string {
  return value.replace(/[:*?"<>|]/g, '_').replace(/\.\./g, '__')
}

async function analyzeNode({
  node,
  page,
  aiOutput,
  outputDir,
  sourceContent,
  sourceHash,
  engine,
  model,
  maxSourceChars,
  existing,
}: {
  node: AiNode
  page: AiPage
  aiOutput: AiOutput
  outputDir: string
  sourceContent?: string
  sourceHash?: string
  engine?: AiEngine
  model?: string
  maxSourceChars: number
  existing?: ComponentAnalysisFile
}): Promise<ComponentAnalysisFile> {
  const resolvedEngine = resolveEngine(engine)
  const resolvedModel = model ?? getDefaultModel(resolvedEngine)

  if (node.scope === 'external') {
    return buildAnalysisFile(node, page.route, sourceHash, existing, {
      status: 'skipped',
      content: 'External dependency. No source available.',
      engine: resolvedEngine,
      model: resolvedModel,
    })
  }

  if (resolvedEngine === 'none') {
    return buildAnalysisFile(node, page.route, sourceHash, existing, {
      status: 'skipped',
      content: 'AI engine not configured. Set API key or use --engine.',
      engine: resolvedEngine,
      model: resolvedModel,
    })
  }

  if (!sourceContent) {
    return buildAnalysisFile(node, page.route, sourceHash, existing, {
      status: 'skipped',
      content: 'Source file not found.',
      engine: resolvedEngine,
      model: resolvedModel,
    })
  }

  const dependencyContext = await buildDependencyContext(node, aiOutput, outputDir)
  const prompt = buildPrompt(node, dependencyContext, sourceContent.slice(0, maxSourceChars))

  try {
    const text = await runModel(prompt, resolvedEngine, resolvedModel)
    const summary = extractSummary(text)
    return buildAnalysisFile(node, page.route, sourceHash, existing, {
      status: 'done',
      content: text,
      summary,
      engine: resolvedEngine,
      model: resolvedModel,
    })
  } catch (error) {
    return buildAnalysisFile(node, page.route, sourceHash, existing, {
      status: 'error',
      content: '',
      summary: undefined,
      engine: resolvedEngine,
      model: resolvedModel,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

function buildAnalysisFile(
  node: AiNode,
  route: string,
  sourceHash: string | undefined,
  existing: ComponentAnalysisFile | undefined,
  analysis: {
    status: AnalysisStatus
    content: string
    summary?: string
    engine?: AiEngine
    model?: string
    error?: string
  }
): ComponentAnalysisFile {
  const existingRoutes = existing?.routes ?? []
  const routes = Array.from(new Set([...existingRoutes, route]))
  return {
    id: node.id,
    routes,
    scope: node.scope,
    path: node.path,
    relativePath: node.relativePath,
    dependencies: node.dependencies,
    dependents: node.dependents,
    analysis: {
      status: analysis.status,
      summary: analysis.summary,
      content: analysis.content,
      model: analysis.model,
      engine: analysis.engine,
      promptVersion: PROMPT_VERSION,
      sourceHash,
      updatedAt: new Date().toISOString(),
      error: analysis.error,
    },
  }
}

async function buildDependencyContext(node: AiNode, aiOutput: AiOutput, outputDir: string): Promise<string> {
  const summaries: string[] = []
  for (const depId of node.dependencies.slice(0, 8)) {
    const depNode = aiOutput.nodes[depId]
    if (!depNode) continue
    const depPath = getComponentOutputPath(outputDir, depNode)
    const depFile = await readJsonSafe<ComponentAnalysisFile>(depPath)
    if (depFile?.analysis?.status === 'done' && depFile.analysis.summary) {
      summaries.push(`- ${shortName(depId)}: ${trimText(depFile.analysis.summary, 200)}`)
    }
  }

  if (summaries.length === 0) {
    return 'None'
  }

  return summaries.join('\n')
}

function ensureRouteRecorded(existing: ComponentAnalysisFile, route: string): ComponentAnalysisFile | undefined {
  if (existing.routes.includes(route)) {
    return undefined
  }
  return {
    ...existing,
    routes: [...existing.routes, route],
    analysis: {
      ...existing.analysis,
      updatedAt: new Date().toISOString(),
    },
  }
}

function buildPrompt(node: AiNode, dependencyContext: string, source: string): string {
  return [
    '你是资深前端工程师，负责组件级功能分析。',
    '请基于给定源码与依赖摘要输出分析，格式要求：',
    '1) 第一行必须以 "Summary: " 开头，简洁描述组件职责。',
    '2) 后续使用小标题：Responsibilities, Behavior, Dependencies, Notes。',
    '3) 如果是推断内容，请在 Notes 中标注 "推断"。',
    '',
    '[Component]',
    `ID: ${node.id}`,
    node.path ? `Path: ${node.path}` : '',
    node.relativePath ? `Relative: ${node.relativePath}` : '',
    '',
    '[Dependencies Summary]',
    dependencyContext,
    '',
    '[Source]',
    source,
  ]
    .filter(Boolean)
    .join('\n')
}

async function runModel(prompt: string, engine: AiEngine, model: string): Promise<string> {
  if (engine === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not set')
    const google = createGoogleGenerativeAI({ apiKey })
    const result = await generateText({
      model: google(model),
      messages: [
        { role: 'system', content: '你是资深前端工程师，负责组件功能分析。' },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  if (engine === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    const openai = createOpenAI({ apiKey })
    const result = await generateText({
      model: openai(model),
      messages: [
        { role: 'system', content: '你是资深前端工程师，负责组件功能分析。' },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  if (engine === 'zhipu') {
    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) throw new Error('ZHIPU_API_KEY is not set')
    const baseURL = process.env.ZHIPU_BASE_URL
    const provider = baseURL ? createZhipu({ apiKey, baseURL }) : zhipu
    const result = await generateText({
      model: provider(model),
      messages: [
        { role: 'system', content: '你是资深前端工程师，负责组件功能分析。' },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  return ''
}

function resolveEngine(engine?: AiEngine | string): AiEngine {
  if (engine === 'openai' || engine === 'google' || engine === 'zhipu' || engine === 'none') return engine
  if (process.env.GOOGLE_API_KEY) return 'google'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ZHIPU_API_KEY) return 'zhipu'
  return 'none'
}

function getDefaultModel(engine: AiEngine): string {
  if (engine === 'google') return 'gemini-2.5-flash'
  if (engine === 'openai') return 'gpt-4o-mini'
  if (engine === 'zhipu') return 'glm-4-plus'
  return 'none'
}

async function readSourceContent(node: AiNode): Promise<string | undefined> {
  if (!node.path || !isAbsolute(node.path)) {
    return undefined
  }
  try {
    return await readFile(node.path, 'utf-8')
  } catch {
    return undefined
  }
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function extractSummary(text: string): string | undefined {
  const firstLine = text.split('\n')[0]?.trim()
  if (!firstLine) return undefined
  if (firstLine.startsWith('Summary:')) {
    return firstLine.replace(/^Summary:\s*/i, '').trim()
  }
  return trimText(firstLine, 200)
}

function trimText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
}

async function readJsonSafe<T>(path: string): Promise<T | undefined> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return undefined
  }
}
