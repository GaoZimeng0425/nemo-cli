/**
 * D3 Force-directed layout strategy
 */

// @ts-expect-error - d3 types are available but not detected
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX } from 'd3'

import type { GraphEdge, GraphNode } from '../../types'
import type { LayoutResult, LayoutStrategy } from './types'

/**
 * D3 Force layout strategy
 * Creates a force-directed graph that naturally clusters related nodes
 */
export class ForceLayoutStrategy implements LayoutStrategy {
  name = 'force' as const

  async apply(
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: { iterations?: number; width?: number; height?: number } = {}
  ): Promise<LayoutResult> {
    const { iterations = 1000, width = 4000, height = 3000 } = options

    console.log('[ForceLayout] Starting layout with:', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      iterations,
      width,
      height,
    })

    // Find entry nodes (nodes with no dependents - roots)
    const entryNodeIds = new Set(nodes.filter((n) => n.data.dependentCount === 0).map((n) => n.id))
    console.log('[ForceLayout] Entry nodes (no dependents):', entryNodeIds.size)

    // Create a map for simulation nodes with initial positions
    const simNodes = nodes.map((node) => {
      // Entry nodes start on the left side
      const isEntry = entryNodeIds.has(node.id)
      const x = isEntry
        ? Math.random() * (width * 0.2) // Left 20% of canvas
        : width * 0.3 + Math.random() * (width * 0.7) // Right 70%
      const y = Math.random() * height

      return {
        id: node.id,
        x,
        y,
        vx: 0,
        vy: 0,
        isEntry,
      }
    })

    // Create link data with proper references
    const linkData = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }))

    const simulation = forceSimulation(simNodes, {
      iterations: 0,
    })

    // Add directional force to keep entries on left
    simulation
      .force(
        'link',
        forceLink(linkData)
          .id((d: any) => d.id)
          .distance(300)
      )
      .force('charge', forceManyBody().strength(-800))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide().radius(150).iterations(2))
      .force(
        'x',
        forceX((d: any) => {
          // Entry nodes gravitate to left, others to center/right
          return d.isEntry ? width * 0.15 : width * 0.6
        }).strength(0.3)
      )

    // Run simulation
    for (let i = 0; i < iterations; i++) {
      simulation.tick()
    }

    // Create position map
    const positionMap = new Map(simNodes.map((n) => [n.id, { x: n.x || 0, y: n.y || 0 }]))

    console.log(
      '[ForceLayout] Simulation complete. Sample positions:',
      Array.from(positionMap.entries())
        .slice(0, 3)
        .map(([id, pos]) => ({
          id,
          x: Math.round(pos.x),
          y: Math.round(pos.y),
        }))
    )

    // Apply positions to original nodes
    const layoutedNodes = nodes.map((node) => {
      const pos = positionMap.get(node.id) || { x: 0, y: 0 }
      return {
        ...node,
        position: pos,
      }
    })

    console.log(
      '[ForceLayout] Layouted nodes sample:',
      layoutedNodes.slice(0, 3).map((n) => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      }))
    )

    return {
      nodes: layoutedNodes,
      edges,
    }
  }
}

/**
 * Hierarchical layout strategy using D3
 * Creates a tree-like layout showing dependency hierarchy
 */
export class HierarchicalD3LayoutStrategy implements LayoutStrategy {
  name = 'hierarchical-d3' as const

  async apply(
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: { nodeSize?: number; levelSpacing?: number } = {}
  ): Promise<LayoutResult> {
    const { nodeSize = 200, levelSpacing = 200 } = options

    // Build dependency levels using BFS
    const levels = this.buildLevels(nodes, edges)

    // Position nodes by level
    const layoutedNodes: GraphNode[] = []
    const xPos = new Map<string, number>()

    levels.forEach((levelNodes, levelIndex) => {
      levelNodes.forEach((node, nodeIndex) => {
        const x = nodeIndex * nodeSize
        const y = levelIndex * levelSpacing

        layoutedNodes.push({
          ...node,
          position: { x, y },
        })

        xPos.set(node.id, x)
      })
    })

    return {
      nodes: layoutedNodes,
      edges,
    }
  }

  private buildLevels(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[][] {
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0)
      adj.set(node.id, [])
    }

    // Count in-degrees
    for (const edge of edges) {
      const sources = adj.get(edge.source) || []
      sources.push(edge.target)
      adj.set(edge.source, sources)

      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    // Kahn's algorithm for topological sort with levels
    const levels: GraphNode[][] = []
    const remaining = new Set(nodes.map((n) => n.id))
    const currentLevel: GraphNode[] = []

    // Find root nodes (in-degree = 0)
    for (const node of nodes) {
      if ((inDegree.get(node.id) || 0) === 0) {
        currentLevel.push(node)
        remaining.delete(node.id)
      }
    }

    while (currentLevel.length > 0 || remaining.size > 0) {
      levels.push([...currentLevel])

      // Find next level
      const nextLevel: GraphNode[] = []
      const processed = new Set<string>()

      for (const node of currentLevel) {
        for (const target of adj.get(node.id) || []) {
          if (remaining.has(target) && !processed.has(target)) {
            nextLevel.push(nodes.find((n) => n.id === target)!)
            processed.add(target)
            remaining.delete(target)
          }
        }
      }

      currentLevel.length = 0
      currentLevel.push(...nextLevel)

      // If no progress, pick remaining nodes
      if (nextLevel.length === 0 && remaining.size > 0) {
        const nodeId = Array.from(remaining)[0]
        if (nodeId) {
          const node = nodes.find((n) => n.id === nodeId)
          if (node) {
            currentLevel.push(node)
            remaining.delete(nodeId)
          }
        }
      }
    }

    return levels
  }
}
