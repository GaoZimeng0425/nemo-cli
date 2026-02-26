import { z } from 'zod'

import type { AiOutput, ModuleSystem, NodeScope, NodeType, RouteType } from '../types'

/**
 * Zod schema for validating AiOutput structure
 */
const NodeScopeSchema: z.ZodType<NodeScope> = z.enum(['app', 'workspace', 'external', 'internal'])

const NodeTypeSchema: z.ZodType<NodeType> = z.enum([
  'page',
  'layout',
  'route',
  'component',
  'util',
  'external',
  'unknown',
])

const ModuleSystemSchema: z.ZodType<ModuleSystem> = z.enum(['es6', 'commonjs', 'amd', 'unknown'])

const RouteTypeSchema: z.ZodType<RouteType> = z.enum(['page', 'layout', 'route', 'error', 'loading', 'not-found'])

const AiNodeSchema = z.object({
  id: z.string(),
  path: z.string().optional(),
  relativePath: z.string().optional(),
  scope: NodeScopeSchema,
  packageName: z.string().optional(),
  workspacePackage: z.string().optional(),
  moduleSystem: ModuleSystemSchema,
  dynamic: z.boolean(),
  type: NodeTypeSchema,
  dependencies: z.array(z.string()),
  dependents: z.array(z.string()),
})

const AiPageSchema = z.object({
  route: z.string(),
  routeType: RouteTypeSchema,
  entryFile: z.string(),
  layoutChain: z.array(z.string()),
  rootIds: z.array(z.string()),
  nodeIds: z.array(z.string()),
  orderGroups: z.array(z.array(z.string())),
})

const AiSccGroupSchema = z.object({
  id: z.string(),
  nodes: z.array(z.string()),
})

const AiOutputMetaSchema = z.object({
  generatedAt: z.string(),
  appRoot: z.string(),
  appDir: z.string(),
  workspaceRoot: z.string().optional(),
  nodeKeyStrategy: z.literal('relative').optional(),
  toolVersion: z.string().optional(),
})

export const AiOutputSchema = z.object({
  meta: AiOutputMetaSchema,
  nodes: z.record(z.string(), AiNodeSchema),
  pages: z.record(z.string(), AiPageSchema),
  nodeToPages: z.record(z.string(), z.array(z.string())),
  sccs: z.array(AiSccGroupSchema),
  nodeToScc: z.record(z.string(), z.string()),
})

/**
 * Parse and validate AiOutput from JSON file
 *
 * @param file - File object to parse
 * @param maxSize - Maximum allowed file size in bytes (default: 50MB)
 * @returns Parsed and validated AiOutput
 * @throws Error with user-friendly message
 */
export async function parseAiOutput(file: File, maxSize: number = 50 * 1024 * 1024): Promise<AiOutput> {
  // File size validation
  if (file.size > maxSize) {
    throw new Error(
      `文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB), 最大允许 ${maxSize / 1024 / 1024}MB。` +
        '对于超大型项目,系统会自动启用聚合模式。'
    )
  }

  // File existence check (browser API ensures this)
  if (file.size === 0) {
    throw new Error('文件为空,请检查是否选择了正确的文件。')
  }

  let jsonText: string

  try {
    jsonText = await file.text()
  } catch {
    throw new Error('无法读取文件,请确保文件格式正确。')
  }

  let jsonData: unknown

  try {
    jsonData = JSON.parse(jsonText)
  } catch {
    throw new Error('JSON 格式错误。请重新运行 `nd analyze --format ai` 生成文件。')
  }

  // Schema validation
  const result = AiOutputSchema.safeParse(jsonData)

  if (!result.success) {
    const issues = result.error.issues
    const firstIssue = issues[0]

    if (!firstIssue) {
      throw new Error('依赖文件验证失败,请确保使用最新版本的 nemo-cli 生成文件。')
    }

    if (firstIssue.path.length > 0) {
      throw new Error(
        `依赖文件格式不匹配: ${firstIssue.path.join('.')} - ${firstIssue.message}\n` +
          '请确保使用最新版本的 nemo-cli 生成文件。'
      )
    }
    throw new Error(`依赖文件验证失败: ${firstIssue.message}\n请确保使用最新版本的 nemo-cli 生成文件。`)
  }

  // Version compatibility check (optional, if toolVersion exists)
  if (result.data.meta.toolVersion) {
    const currentVersion = '0.1.0' // Visualizer version
    // You could add version compatibility logic here
    // For now, we just accept it
  }

  return result.data
}

/**
 * Check if a file is likely a deps.ai.json file
 */
export function isValidDepsAiFile(file: File): boolean {
  return file.name === 'deps.ai.json' || file.name.endsWith('.ai.json')
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(file: File): number {
  return file.size / 1024 / 1024
}
