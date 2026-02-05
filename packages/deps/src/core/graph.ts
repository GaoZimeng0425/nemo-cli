import type { DependencyGraph, DependencyNode, ModuleSystem, NodeType } from './types.js'

export class GraphBuilder {
  private nodes: Map<string, DependencyNode>
  private edges: Map<string, Set<string>>
  private entryPoints: Set<string>

  constructor() {
    this.nodes = new Map()
    this.edges = new Map()
    this.entryPoints = new Set()
  }

  addNode(id: string, moduleSystem: ModuleSystem, type: NodeType = 'unknown', dynamic = false): DependencyNode {
    const existing = this.nodes.get(id)

    if (existing) {
      return existing
    }

    const node: DependencyNode = {
      id,
      dependencies: new Set(),
      dependents: new Set(),
      moduleSystem,
      dynamic,
      type,
    }

    this.nodes.set(id, node)
    this.edges.set(id, new Set())

    return node
  }

  addEdge(from: string, to: string): void {
    const fromNode = this.nodes.get(from)
    const toNode = this.nodes.get(to)

    if (!fromNode || !toNode) {
      return
    }

    fromNode.dependencies.add(to)
    toNode.dependents.add(from)

    const fromEdges = this.edges.get(from)
    if (fromEdges) {
      fromEdges.add(to)
    }
  }

  markAsEntryPoint(id: string): void {
    this.entryPoints.add(id)
  }

  getGraph(): DependencyGraph {
    return {
      nodes: this.nodes,
      edges: this.edges,
      entryPoints: Array.from(this.entryPoints),
    }
  }

  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id)
  }

  getNodeCount(): number {
    return this.nodes.size
  }

  getEdgeCount(): number {
    let count = 0
    for (const edges of this.edges.values()) {
      count += edges.size
    }
    return count
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
    this.entryPoints.clear()
  }
}

export function createGraphBuilder(): GraphBuilder {
  return new GraphBuilder()
}
