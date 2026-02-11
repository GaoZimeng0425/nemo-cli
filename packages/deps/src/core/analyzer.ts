import type { AnalysisResult, DependencyGraph } from './types'

export class DependencyAnalyzer {
  graph: DependencyGraph

  constructor(graph: DependencyGraph) {
    this.graph = graph
  }

  analyze(): AnalysisResult {
    const cycles = this.detectCycles()
    const leaves = this.findLeaves()
    const orphans = this.findOrphans()
    const topologicalOrder = this.topologicalSort()
    const stats = this.calculateStats(leaves, topologicalOrder)

    return {
      graph: this.graph,
      cycles,
      leaves,
      orphans,
      topologicalOrder,
      stats,
    }
  }

  detectCycles(): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const path: string[] = []

    const dfs = (nodeId: string): void => {
      if (recStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId)
        cycles.push([...path.slice(cycleStart), nodeId])
        return
      }

      if (visited.has(nodeId)) {
        return
      }

      visited.add(nodeId)
      recStack.add(nodeId)
      path.push(nodeId)

      const node = this.graph.nodes.get(nodeId)
      if (node) {
        for (const depId of node.dependencies) {
          dfs(depId)
        }
      }

      recStack.delete(nodeId)
      path.pop()
    }

    for (const nodeId of this.graph.nodes.keys()) {
      dfs(nodeId)
    }

    return cycles
  }

  findLeaves(): string[] {
    const leaves: string[] = []

    for (const [id, node] of this.graph.nodes) {
      if (node.dependencies.size === 0) {
        leaves.push(id)
      }
    }

    return leaves
  }

  findOrphans(): string[] {
    const orphans: string[] = []

    for (const [id, node] of this.graph.nodes) {
      if (node.dependents.size === 0 && !this.graph.entryPoints.includes(id)) {
        orphans.push(id)
      }
    }

    return orphans
  }

  topologicalSort(): string[] {
    const result: string[] = []
    const inDegree = new Map<string, number>()
    const queue: string[] = []

    for (const [nodeId, node] of this.graph.nodes) {
      inDegree.set(nodeId, node.dependencies.size)
      if (node.dependencies.size === 0) {
        queue.push(nodeId)
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!

      if (!current) {
        break
      }

      result.push(current)

      const currentNode = this.graph.nodes.get(current)
      if (!currentNode) {
        continue
      }

      for (const depId of currentNode.dependencies) {
        const currentDegree = inDegree.get(depId) ?? 0
        const newDegree = currentDegree - 1
        inDegree.set(depId, newDegree)

        if (newDegree === 0) {
          queue.push(depId)
        }
      }
    }

    return result
  }

  calculateStats(_leaves: string[], _topologicalOrderr: string[]): AnalysisResult['stats'] {
    const totalNodes = this.graph.nodes.size
    const totalEdges = this.getEdgeCount()

    let maxDepth = 0
    for (const entryPoint of this.graph.entryPoints) {
      const depth = this.calculateDepth(entryPoint)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }

    let totalDeps = 0
    for (const node of this.graph.nodes.values()) {
      totalDeps += node.dependencies.size
    }

    const averageDependencies = totalNodes > 0 ? totalDeps / totalNodes : 0

    return {
      totalNodes,
      totalEdges,
      maxDepth,
      averageDependencies: Math.round(averageDependencies * 100) / 100,
    }
  }

  private calculateDepth(nodeId: string, visited = new Set<string>()): number {
    if (visited.has(nodeId)) {
      return 0
    }

    visited.add(nodeId)

    const node = this.graph.nodes.get(nodeId)
    if (!node || node.dependencies.size === 0) {
      return 1
    }

    let maxChildDepth = 0
    for (const depId of node.dependencies) {
      const childDepth = this.calculateDepth(depId, new Set(visited))
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth
      }
    }

    return maxChildDepth + 1
  }

  private getEdgeCount(): number {
    let count = 0
    for (const edges of this.graph.edges.values()) {
      count += edges.size
    }
    return count
  }
}

export function createAnalyzer(graph: DependencyGraph): DependencyAnalyzer {
  return new DependencyAnalyzer(graph)
}
