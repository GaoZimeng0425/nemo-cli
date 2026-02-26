/**
 * Simple grid layout strategy (fallback when ELK is not available)
 */

import type { GraphEdge, GraphNode } from '../../types'
import type { LayoutResult, LayoutStrategy } from './types'

// Grid layout constants
const GRID_SIZE = 250
const COLS = 5
const ROW_GAP = 150

/**
 * Simple grid layout strategy
 */
export class GridLayoutStrategy implements LayoutStrategy {
  name = 'grid' as const

  async apply(nodes: GraphNode[], edges: GraphEdge[]): Promise<LayoutResult> {
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % COLS) * GRID_SIZE,
        y: Math.floor(index / COLS) * ROW_GAP,
      },
    }))

    return {
      nodes: layoutedNodes,
      edges,
    }
  }
}

/**
 * Hierarchical layout strategy (simple tree-like layout)
 */
export class HierarchicalLayoutStrategy implements LayoutStrategy {
  name = 'hierarchical' as const

  async apply(nodes: GraphNode[], edges: GraphEdge[]): Promise<LayoutResult> {
    // Build adjacency list
    const adj = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    for (const node of nodes) {
      adj.set(node.id, [])
      inDegree.set(node.id, 0)
    }

    for (const edge of edges) {
      adj.get(edge.source)?.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    // Topological sort
    const sorted: string[] = []
    const queue: string[] = []

    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id)
    }

    while (queue.length > 0) {
      const id = queue.shift()!
      sorted.push(id)

      for (const target of adj.get(id) || []) {
        const newDegree = (inDegree.get(target) || 0) - 1
        inDegree.set(target, newDegree)
        if (newDegree === 0) queue.push(target)
      }
    }

    // Layout in layers
    const levels: GraphNode[][] = []
    const visited = new Set<string>()

    for (const id of sorted) {
      if (visited.has(id)) continue

      const level: GraphNode[] = []
      const queue = [id]
      visited.add(id)

      while (queue.length > 0 && level.length < 10) {
        const currentId = queue.shift()!
        const node = nodes.find((n) => n.id === currentId)
        if (node) level.push(node)

        // Add children
        for (const target of adj.get(currentId) || []) {
          if (!visited.has(target)) {
            visited.add(target)
            queue.push(target)
          }
        }
      }

      if (level.length > 0) levels.push(level)
    }

    // Position nodes
    const layoutedNodes: GraphNode[] = []
    const X_SPACING = 250
    const Y_SPACING = 150

    levels.forEach((level, levelIndex) => {
      level.forEach((node, nodeIndex) => {
        layoutedNodes.push({
          ...node,
          position: {
            x: nodeIndex * X_SPACING,
            y: levelIndex * Y_SPACING,
          },
        })
      })
    })

    // Add remaining nodes that weren't in the topological sort
    const placedIds = new Set(layoutedNodes.map((n) => n.id))
    for (const node of nodes) {
      if (!placedIds.has(node.id)) {
        layoutedNodes.push({
          ...node,
          position: {
            x: (layoutedNodes.length % COLS) * GRID_SIZE,
            y: Math.floor(layoutedNodes.length / COLS) * ROW_GAP,
          },
        })
      }
    }

    return {
      nodes: layoutedNodes,
      edges,
    }
  }
}
