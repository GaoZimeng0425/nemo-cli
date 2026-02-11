import { existsSync } from 'node:fs'
import { dirname, extname, isAbsolute, resolve } from 'node:path'

import type { AiNode, AiOutput, AiPage, AiSccGroup, AnalysisResult, DependencyGraph, NodeScope } from '../core/types.js'

export interface AiOutputOptions {
  appRoot: string
  appDir: string
  workspaceRoot?: string
  workspacePackages?: Map<string, string>
  includeLayouts?: boolean
}

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const LAYOUT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

export function generateAiOutput(analysis: AnalysisResult, options: AiOutputOptions): string {
  const output = buildAiOutput(analysis, options)
  return JSON.stringify(output, null, 2)
}

function buildAiOutput(analysis: AnalysisResult, options: AiOutputOptions): AiOutput {
  const { appRoot, appDir, workspaceRoot, workspacePackages } = options
  const includeLayouts = options.includeLayouts ?? true

  const { sccs, nodeToScc } = computeSccs(analysis.graph)

  const pages: Record<string, AiPage> = {}
  const nodeToPages: Record<string, string[]> = {}
  const usedNodeIds = new Set<string>()

  const routes = analysis.graph.routes
  if (routes && routes.size > 0) {
    for (const [filePath, meta] of routes) {
      if (meta.routeType !== 'page') {
        continue
      }

      const layoutChain = includeLayouts ? findLayoutChain(filePath, appDir) : []
      const rootIds = [filePath, ...layoutChain]
      const nodeIds = collectNodeIds(analysis.graph, rootIds)
      for (const nodeId of nodeIds) {
        usedNodeIds.add(nodeId)
        if (!nodeToPages[nodeId]) {
          nodeToPages[nodeId] = []
        }
        nodeToPages[nodeId].push(meta.routePath)
      }

      const orderGroups = buildOrderGroups(analysis.graph, nodeIds, nodeToScc)

      pages[meta.routePath] = {
        route: meta.routePath,
        routeType: meta.routeType,
        entryFile: filePath,
        layoutChain,
        rootIds,
        nodeIds,
        orderGroups,
      }
    }
  } else {
    // Fallback: treat entry points as pages
    for (const entryFile of analysis.graph.entryPoints) {
      const rootIds = [entryFile]
      const nodeIds = collectNodeIds(analysis.graph, rootIds)
      const routeKey = entryFile

      for (const nodeId of nodeIds) {
        usedNodeIds.add(nodeId)
        if (!nodeToPages[nodeId]) {
          nodeToPages[nodeId] = []
        }
        nodeToPages[nodeId].push(routeKey)
      }

      const orderGroups = buildOrderGroups(analysis.graph, nodeIds, nodeToScc)

      pages[routeKey] = {
        route: routeKey,
        routeType: 'page',
        entryFile,
        layoutChain: [],
        rootIds,
        nodeIds,
        orderGroups,
      }
    }
  }

  const nodes: Record<string, AiNode> = {}
  for (const nodeId of usedNodeIds) {
    const graphNode = analysis.graph.nodes.get(nodeId)
    if (!graphNode) {
      continue
    }

    const { scope, packageName, workspacePackage, relativePath } = classifyNode(
      nodeId,
      appRoot,
      workspaceRoot,
      workspacePackages
    )

    const dependencies = Array.from(graphNode.dependencies).filter(
      (depId) => usedNodeIds.has(depId) && isCodeNode(depId)
    )
    const dependents = Array.from(graphNode.dependents).filter((depId) => usedNodeIds.has(depId) && isCodeNode(depId))

    nodes[nodeId] = {
      id: nodeId,
      path: isAbsolute(nodeId) ? nodeId : undefined,
      relativePath,
      scope,
      packageName,
      workspacePackage,
      moduleSystem: graphNode.moduleSystem,
      dynamic: graphNode.dynamic,
      type: graphNode.type,
      dependencies,
      dependents,
    }
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      appRoot,
      appDir,
      workspaceRoot,
    },
    nodes,
    pages,
    nodeToPages,
    sccs,
    nodeToScc,
  }
}

function collectNodeIds(graph: DependencyGraph, rootIds: string[]): string[] {
  const result = new Set<string>()
  const stack = [...rootIds]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    if (result.has(current)) {
      continue
    }

    if (!isCodeNode(current)) {
      continue
    }

    result.add(current)

    const node = graph.nodes.get(current)
    if (!node) {
      continue
    }

    for (const depId of node.dependencies) {
      if (!result.has(depId)) {
        stack.push(depId)
      }
    }
  }

  return Array.from(result)
}

function findLayoutChain(entryFile: string, appDir: string): string[] {
  const layouts: string[] = []
  let currentDir = dirname(entryFile)

  while (currentDir.startsWith(appDir)) {
    for (const ext of LAYOUT_EXTENSIONS) {
      const candidate = resolve(currentDir, `layout${ext}`)
      if (existsSync(candidate)) {
        layouts.push(candidate)
        break
      }
    }

    if (currentDir === appDir) {
      break
    }
    currentDir = dirname(currentDir)
  }

  return layouts.reverse()
}

function classifyNode(
  nodeId: string,
  appRoot: string,
  workspaceRoot?: string,
  workspacePackages?: Map<string, string>
): {
  scope: NodeScope
  packageName?: string
  workspacePackage?: string
  relativePath?: string
} {
  if (!isAbsolute(nodeId)) {
    return {
      scope: 'external',
      packageName: getPackageName(nodeId),
    }
  }

  if (nodeId.includes('/node_modules/') || nodeId.includes('\\node_modules\\')) {
    return {
      scope: 'external',
      packageName: getPackageNameFromPath(nodeId),
    }
  }

  if (nodeId.startsWith(appRoot)) {
    return {
      scope: 'app',
      relativePath: nodeId.slice(appRoot.length + 1),
    }
  }

  if (workspacePackages && workspacePackages.size > 0) {
    for (const [pkgName, pkgDir] of workspacePackages.entries()) {
      if (nodeId.startsWith(pkgDir)) {
        return {
          scope: 'workspace',
          workspacePackage: pkgName,
          relativePath: workspaceRoot ? nodeId.slice(workspaceRoot.length + 1) : nodeId,
        }
      }
    }
  }

  return {
    scope: 'internal',
    relativePath: workspaceRoot ? nodeId.slice(workspaceRoot.length + 1) : nodeId,
  }
}

function getPackageName(moduleId: string): string {
  if (moduleId.startsWith('@')) {
    const parts = moduleId.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : moduleId
  }
  return moduleId.split('/')[0] || moduleId
}

function getPackageNameFromPath(filePath: string): string | undefined {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/node_modules/')
  if (idx === -1) {
    return undefined
  }
  const rest = normalized.slice(idx + '/node_modules/'.length)
  return getPackageName(rest)
}

function isCodeNode(nodeId: string): boolean {
  if (!isAbsolute(nodeId)) {
    return true
  }
  const ext = extname(nodeId)
  if (!ext) {
    return true
  }
  return CODE_EXTENSIONS.has(ext)
}

function computeSccs(graph: DependencyGraph): {
  sccs: AiSccGroup[]
  nodeToScc: Record<string, string>
} {
  const indexMap = new Map<string, number>()
  const lowLinkMap = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const sccs: AiSccGroup[] = []
  const nodeToScc: Record<string, string> = {}
  let index = 0

  const strongConnect = (nodeId: string) => {
    indexMap.set(nodeId, index)
    lowLinkMap.set(nodeId, index)
    index += 1
    stack.push(nodeId)
    onStack.add(nodeId)

    const node = graph.nodes.get(nodeId)
    if (node) {
      for (const depId of node.dependencies) {
        if (!indexMap.has(depId)) {
          strongConnect(depId)
          const lowLink = Math.min(lowLinkMap.get(nodeId) ?? 0, lowLinkMap.get(depId) ?? 0)
          lowLinkMap.set(nodeId, lowLink)
        } else if (onStack.has(depId)) {
          const lowLink = Math.min(lowLinkMap.get(nodeId) ?? 0, indexMap.get(depId) ?? 0)
          lowLinkMap.set(nodeId, lowLink)
        }
      }
    }

    if (lowLinkMap.get(nodeId) === indexMap.get(nodeId)) {
      const nodes: string[] = []
      while (stack.length > 0) {
        const w = stack.pop()
        if (!w) break
        onStack.delete(w)
        nodes.push(w)
        if (w === nodeId) {
          break
        }
      }
      const sccId = `scc_${sccs.length}`
      for (const n of nodes) {
        nodeToScc[n] = sccId
      }
      sccs.push({ id: sccId, nodes })
    }
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!indexMap.has(nodeId)) {
      strongConnect(nodeId)
    }
  }

  return { sccs, nodeToScc }
}

function buildOrderGroups(graph: DependencyGraph, nodeIds: string[], nodeToScc: Record<string, string>): string[][] {
  const nodeSet = new Set(nodeIds)
  const sccSet = new Set<string>()

  for (const nodeId of nodeIds) {
    const sccId = nodeToScc[nodeId]
    if (sccId) {
      sccSet.add(sccId)
    }
  }

  const edges = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()

  for (const sccId of sccSet) {
    edges.set(sccId, new Set())
    inDegree.set(sccId, 0)
  }

  for (const nodeId of nodeIds) {
    const node = graph.nodes.get(nodeId)
    if (!node) continue
    const fromScc = nodeToScc[nodeId]
    if (!fromScc) continue

    for (const depId of node.dependencies) {
      if (!nodeSet.has(depId)) continue
      const toScc = nodeToScc[depId]
      if (!toScc || toScc === fromScc) continue
      const bucket = edges.get(toScc)
      if (bucket && !bucket.has(fromScc)) {
        bucket.add(fromScc)
        inDegree.set(fromScc, (inDegree.get(fromScc) ?? 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [sccId, degree] of inDegree) {
    if (degree === 0) queue.push(sccId)
  }

  const ordered: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    ordered.push(current)
    const targets = edges.get(current) ?? new Set()
    for (const target of targets) {
      const nextDegree = (inDegree.get(target) ?? 0) - 1
      inDegree.set(target, nextDegree)
      if (nextDegree === 0) {
        queue.push(target)
      }
    }
  }

  const groups: string[][] = []
  for (const sccId of ordered) {
    const members = nodeIds.filter((nodeId) => nodeToScc[nodeId] === sccId)
    if (members.length > 0) {
      groups.push(members)
    }
  }

  return groups
}
