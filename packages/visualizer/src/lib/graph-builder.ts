/**
 * Graph builder utilities
 */

import type { AiOutput, GraphEdge, GraphNode } from '../types'
import { HierarchicalLayoutStrategy } from './layout/hierarchical-layout'

/**
 * Build React Flow graph from AiOutput
 */
export async function buildReactFlowGraph(aiOutput: AiOutput): Promise<{
  nodes: GraphNode[]
  edges: GraphEdge[]
}> {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Create nodes
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    const sccGroupId = aiOutput.nodeToScc[id]
    const isInCycle = !!sccGroupId

    const node: GraphNode = {
      id,
      type: 'dependencyNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        aiNode,
        isInCycle,
        sccGroupId,
        depCount: aiNode.dependencies.length,
        dependentCount: aiNode.dependents.length,
        pages: aiOutput.nodeToPages[id] || [],
      },
    }

    nodes.push(node)
  }

  // Create edges
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    for (const depId of aiNode.dependencies) {
      // Only create edge if target exists
      if (!aiOutput.nodes[depId]) {
        console.warn(`Missing node: ${depId}, skipping edge`)
        continue
      }

      const edge: GraphEdge = {
        id: `${id}->${depId}`,
        source: id,
        target: depId,
        type: 'smoothstep',
        animated: isInSameScc(id, depId, aiOutput),
        style: isInSameScc(id, depId, aiOutput) ? { stroke: '#EF4444', strokeWidth: 2 } : undefined,
      }

      edges.push(edge)
    }
  }

  // Apply hierarchical layout (entry nodes on left, dependencies flow right)
  const layoutStrategy = new HierarchicalLayoutStrategy()
  const layouted = await layoutStrategy.apply(nodes, edges)

  return {
    nodes: layouted.nodes,
    edges: layouted.edges,
  }
}

/**
 * Check if two nodes are in the same SCC cycle
 */
function isInSameScc(node1Id: string, node2Id: string, aiOutput: AiOutput): boolean {
  const scc1 = aiOutput.nodeToScc[node1Id]
  const scc2 = aiOutput.nodeToScc[node2Id]

  return !!scc1 && !!scc2 && scc1 === scc2
}

/**
 * Create subgraph for specific page
 */
export function buildPageGraph(
  aiOutput: AiOutput,
  pageId: string
): {
  nodes: GraphNode[]
  edges: GraphEdge[]
} {
  const page = aiOutput.pages[pageId]
  if (!page) {
    return { nodes: [], edges: [] }
  }

  const pageNodeIds = new Set(page.nodeIds)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Filter nodes
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    if (pageNodeIds.has(id)) {
      const sccGroupId = aiOutput.nodeToScc[id]
      const isInCycle = !!sccGroupId

      nodes.push({
        id,
        type: 'dependencyNode',
        position: { x: 0, y: 0 },
        data: {
          aiNode,
          isInCycle,
          sccGroupId,
          depCount: aiNode.dependencies.filter((d) => pageNodeIds.has(d)).length,
          dependentCount: aiNode.dependents.filter((d) => pageNodeIds.has(d)).length,
          pages: aiOutput.nodeToPages[id] || [],
        },
      })
    }
  }

  // Filter edges
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    if (!pageNodeIds.has(id)) continue

    for (const depId of aiNode.dependencies) {
      if (!pageNodeIds.has(depId)) continue

      edges.push({
        id: `${id}->${depId}`,
        source: id,
        target: depId,
        type: 'smoothstep',
        animated: isInSameScc(id, depId, aiOutput),
      })
    }
  }

  return { nodes, edges }
}

/**
 * Create SCC-only graph
 */
export function buildSccGraph(aiOutput: AiOutput): {
  nodes: GraphNode[]
  edges: GraphEdge[]
} {
  const sccNodeIds = new Set(aiOutput.sccs.flatMap((scc) => scc.nodes))

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Filter to SCC nodes only
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    if (sccNodeIds.has(id)) {
      const sccGroupId = aiOutput.nodeToScc[id]

      nodes.push({
        id,
        type: 'dependencyNode',
        position: { x: 0, y: 0 },
        data: {
          aiNode,
          isInCycle: true,
          sccGroupId,
          depCount: aiNode.dependencies.filter((d) => sccNodeIds.has(d)).length,
          dependentCount: aiNode.dependents.filter((d) => sccNodeIds.has(d)).length,
          pages: aiOutput.nodeToPages[id] || [],
        },
      })
    }
  }

  // Filter edges to SCC only
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    if (!sccNodeIds.has(id)) continue

    for (const depId of aiNode.dependencies) {
      if (!sccNodeIds.has(depId)) continue

      edges.push({
        id: `${id}->${depId}`,
        source: id,
        target: depId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#EF4444', strokeWidth: 2 },
      })
    }
  }

  return { nodes, edges }
}
