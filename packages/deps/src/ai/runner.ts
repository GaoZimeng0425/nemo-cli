import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path'

import { type AiProviderEngine, getDefaultAiModel, resolveAiEngine, runModelText } from '@nemo-cli/ai'
import type { AiProgressUpdate } from '@nemo-cli/ui'
import type { AiNode, AiOutput, AiPage, NodeScope } from '../core/types'

export interface AiRunOptions {
  aiOutput: AiOutput
  route: string
  outputDir: string
  engine?: AiProviderEngine
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
    engine?: AiProviderEngine
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
  engine?: AiProviderEngine
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
    engine?: AiProviderEngine
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
  const analyzed: string[] = []
  const pending: string[] = []
  for (const depId of node.dependencies) {
    const depNode = aiOutput.nodes[depId]
    if (!depNode) continue

    if (depNode.scope === 'external') {
      continue
    }

    const depPath = getComponentOutputPath(outputDir, depNode)
    const depFile = await readJsonSafe<ComponentAnalysisFile>(depPath)

    if (depFile?.analysis?.status === 'done') {
      const summary = depFile.analysis.summary || extractSummary(depFile.analysis.content || '') || 'No summary'
      const highlights = extractHighlights(depFile.analysis.content)
      analyzed.push(
        [
          `- ${shortName(depId)} (${depId})`,
          `  Summary: ${trimText(summary, 220)}`,
          highlights ? `  Highlights: ${highlights}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      )
    } else {
      pending.push(`- ${shortName(depId)} (${depId})`)
    }
  }

  return [
    `Direct child components: ${analyzed.length + pending.length}`,
    `Analyzed children: ${analyzed.length}`,
    pending.length > 0 ? `Not-yet-analyzed children: ${pending.length}` : '',
    '',
    analyzed.length > 0 ? '[Analyzed Child Summaries]' : '',
    analyzed.length > 0 ? analyzed.join('\n') : '',
    pending.length > 0 ? '' : '',
    pending.length > 0 ? '[Missing Child Analyses]' : '',
    pending.length > 0 ? pending.join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n')
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
    '4) 如果当前源码主要是组合子组件（自身逻辑很少），必须优先汇总 [Analyzed Child Summaries] 得出父组件行为，不能只写“渲染子组件”。',
    '5) 在 Dependencies 小节明确写出哪些结论来自子组件分析，哪些来自当前源码。',
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

function extractHighlights(content?: string): string | undefined {
  if (!content) {
    return undefined
  }
  const compact = content.replace(/\s+/g, ' ').trim()
  if (!compact) {
    return undefined
  }
  return trimText(compact, 280)
}

async function runModel(prompt: string, engine: AiProviderEngine, model: string): Promise<string> {
  return runModelText({
    engine,
    model,
    prompt,
    systemPrompt: '你是资深前端工程师，负责组件功能分析。',
  })
}

function resolveEngine(engine?: AiProviderEngine | string): AiProviderEngine {
  return resolveAiEngine(engine)
}

function getDefaultModel(engine: AiProviderEngine): string {
  return getDefaultAiModel(engine)
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
