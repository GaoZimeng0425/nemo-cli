import { existsSync } from 'node:fs'
import { dirname, extname, isAbsolute, resolve } from 'node:path'

import type { AiNode, AiOutput, AiPage, AiSccGroup, AnalysisResult, DependencyGraph, NodeScope } from '../core/types'

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

  const pagesByRouteRaw: Record<
    string,
    {
      route: string
      routeType: AiPage['routeType']
      entryFile: string
      layoutChain: string[]
      rootIds: string[]
      nodeIds: string[]
      orderGroups: string[][]
    }
  > = {}
  const nodeToPagesRaw: Record<string, string[]> = {}
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
        if (!nodeToPagesRaw[nodeId]) {
          nodeToPagesRaw[nodeId] = []
        }
        nodeToPagesRaw[nodeId].push(meta.routePath)
      }

      const { nodeToScc } = computeSccsForNodes(analysis.graph, nodeIds)
      const orderGroups = buildOrderGroups(analysis.graph, nodeIds, nodeToScc)

      pagesByRouteRaw[meta.routePath] = {
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
        if (!nodeToPagesRaw[nodeId]) {
          nodeToPagesRaw[nodeId] = []
        }
        nodeToPagesRaw[nodeId].push(routeKey)
      }

      const { nodeToScc } = computeSccsForNodes(analysis.graph, nodeIds)
      const orderGroups = buildOrderGroups(analysis.graph, nodeIds, nodeToScc)

      pagesByRouteRaw[routeKey] = {
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

  const nodeIdMap = buildNodeIdMap(usedNodeIds, appRoot, workspaceRoot, workspacePackages)
  const mapNodeId = (nodeId: string) => nodeIdMap.get(nodeId) ?? nodeId

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

    const dependencies = Array.from(graphNode.dependencies)
      .filter((depId) => usedNodeIds.has(depId) && isCodeNode(depId))
      .map(mapNodeId)
    const dependents = Array.from(graphNode.dependents)
      .filter((depId) => usedNodeIds.has(depId) && isCodeNode(depId))
      .map(mapNodeId)

    const mappedId = mapNodeId(nodeId)

    nodes[mappedId] = {
      id: mappedId,
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

  const pages: Record<string, AiPage> = {}
  for (const [routeKey, page] of Object.entries(pagesByRouteRaw)) {
    pages[routeKey] = {
      ...page,
      entryFile: mapNodeId(page.entryFile),
      layoutChain: page.layoutChain.map(mapNodeId),
      rootIds: page.rootIds.map(mapNodeId),
      nodeIds: page.nodeIds.map(mapNodeId),
      orderGroups: page.orderGroups.map((group) => group.map(mapNodeId)),
    }
  }

  const nodeToPages: Record<string, string[]> = {}
  for (const [rawNodeId, routeKeys] of Object.entries(nodeToPagesRaw)) {
    nodeToPages[mapNodeId(rawNodeId)] = routeKeys
  }

  const { sccs, nodeToScc } = computeSccsForNodes(analysis.graph, Array.from(usedNodeIds), nodeIdMap)

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      appRoot,
      appDir,
      workspaceRoot,
      nodeKeyStrategy: 'relative',
    },
    nodes,
    pages,
    nodeToPages,
    sccs,
    nodeToScc,
  }
}

function buildNodeIdMap(
  nodeIds: Set<string>,
  appRoot: string,
  workspaceRoot?: string,
  workspacePackages?: Map<string, string>
): Map<string, string> {
  const result = new Map<string, string>()
  const collisions = new Map<string, string>()

  for (const nodeId of nodeIds) {
    const normalized = normalizeNodeId(nodeId, appRoot, workspaceRoot, workspacePackages)
    if (result.has(nodeId)) {
      continue
    }
    if (collisions.has(normalized)) {
      const previous = collisions.get(normalized)
      if (previous) {
        result.set(previous, `abs:${previous}`)
      }
      result.set(nodeId, `abs:${nodeId}`)
      continue
    }
    collisions.set(normalized, nodeId)
    result.set(nodeId, normalized)
  }

  return result
}

function normalizeNodeId(
  nodeId: string,
  appRoot: string,
  workspaceRoot?: string,
  workspacePackages?: Map<string, string>
): string {
  if (!isAbsolute(nodeId)) {
    return `pkg:${nodeId}`
  }

  if (nodeId.includes('/node_modules/') || nodeId.includes('\\node_modules\\')) {
    return `pkg:${nodeId}`
  }

  if (nodeId.startsWith(appRoot)) {
    return `app:${nodeId.slice(appRoot.length + 1)}`
  }

  if (workspacePackages && workspacePackages.size > 0) {
    for (const [pkgName, pkgDir] of workspacePackages.entries()) {
      if (nodeId.startsWith(pkgDir)) {
        const subPath = nodeId.slice(pkgDir.length + 1)
        return `ws:${pkgName}/${subPath}`
      }
    }
  }

  if (workspaceRoot && nodeId.startsWith(workspaceRoot)) {
    return `root:${nodeId.slice(workspaceRoot.length + 1)}`
  }

  return `abs:${nodeId}`
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

function computeSccsForNodes(
  graph: DependencyGraph,
  nodeIds: string[],
  nodeIdMap?: Map<string, string>
): {
  sccs: AiSccGroup[]
  nodeToScc: Record<string, string>
} {
  const allowed = new Set(nodeIds)
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
        if (!allowed.has(depId)) {
          continue
        }
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
        const mappedId = nodeIdMap?.get(n) ?? n
        nodeToScc[mappedId] = sccId
      }
      sccs.push({ id: sccId, nodes: nodes.map((nodeId) => nodeIdMap?.get(nodeId) ?? nodeId) })
    }
  }

  for (const nodeId of nodeIds) {
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
