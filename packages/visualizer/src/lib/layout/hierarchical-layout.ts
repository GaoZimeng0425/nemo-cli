/**
 * Hierarchical Layout Strategy - Layer nodes from left to right
 * Entry nodes on the left, dependencies flow to the right
 */

import type { GraphEdge, GraphNode } from '../../types'

export interface HierarchicalLayoutOptions {
  nodeWidth: number
  nodeHeight: number
  horizontalSpacing: number
  verticalSpacing: number
}

export class HierarchicalLayoutStrategy {
  private options: HierarchicalLayoutOptions

  constructor(options: Partial<HierarchicalLayoutOptions> = {}) {
    this.options = {
      nodeWidth: 280,
      nodeHeight: 80,
      horizontalSpacing: 50, // Reduced from 100 to 50 - nodes closer together
      verticalSpacing: 20, // Reduced from 50 to 20 - tighter vertical spacing
      ...options,
    }
  }

  async apply(
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: Partial<HierarchicalLayoutOptions> = {}
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const opts = { ...this.options, ...options }

    // Build adjacency map
    const outgoing = new Map<string, string[]>()
    const incoming = new Map<string, string[]>()

    for (const node of nodes) {
      outgoing.set(node.id, [])
      incoming.set(node.id, [])
    }

    for (const edge of edges) {
      outgoing.get(edge.source)?.push(edge.target)
      incoming.get(edge.target)?.push(edge.source)
    }

    // Find entry nodes (no incoming edges or only from external nodes)
    const entryNodes = nodes.filter((n) => {
      const incomings = incoming.get(n.id) || []
      // Entry if no dependents, or only external dependents
      return (
        incomings.length === 0 ||
        incomings.every((id) => {
          const sourceNode = nodes.find((n) => n.id === id)
          return sourceNode?.data.aiNode.scope === 'external'
        })
      )
    })

    // First pass: assign levels using BFS from entry nodes
    const levels = new Map<string, number>()
    const parents = new Map<string, string[]>() // Track parents for each node
    const visited = new Set<string>()
    const queue: string[] = []

    // Start with entry nodes at level 0
    for (const entry of entryNodes) {
      levels.set(entry.id, 0)
      visited.add(entry.id)
      queue.push(entry.id)
    }

    // BFS to assign levels and track parents
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const currentLevel = levels.get(currentId)!

      // Get all direct dependencies (outgoing edges)
      const dependencies = outgoing.get(currentId) || []

      for (const depId of dependencies) {
        const depNode = nodes.find((n) => n.id === depId)
        if (!depNode || depNode.data.aiNode.scope === 'external') continue

        if (!visited.has(depId)) {
          visited.add(depId)
          levels.set(depId, currentLevel + 1)
          queue.push(depId)
        }

        // Track parent relationship
        if (!parents.has(depId)) {
          parents.set(depId, [])
        }
        if (!parents.get(depId)!.includes(currentId)) {
          parents.get(depId)!.push(currentId)
        }
      }
    }

    // Group nodes by level
    const levelGroups = new Map<number, GraphNode[]>()
    for (const node of nodes) {
      if (node.data.aiNode.scope === 'external') continue

      const level = levels.get(node.id) ?? 999
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(node)
    }

    // Calculate positions - parent-centered layout
    const maxLevel = Math.max(...levelGroups.keys())
    const layoutedNodes: GraphNode[] = []
    const nodePositions = new Map<string, { x: number; y: number }>()

    // Level 0: center the entry node(s)
    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = levelGroups.get(level) || []
      if (nodesAtLevel.length === 0) continue

      if (level === 0) {
        // Level 0: center vertically
        nodesAtLevel.sort((a, b) => a.id.localeCompare(b.id))
        const totalHeight = nodesAtLevel.length * opts.nodeHeight + (nodesAtLevel.length - 1) * opts.verticalSpacing
        const startY = -totalHeight / 2

        for (let row = 0; row < nodesAtLevel.length; row++) {
          const node = nodesAtLevel[row]
          const pos = {
            x: 0,
            y: startY + row * (opts.nodeHeight + opts.verticalSpacing),
          }
          nodePositions.set(node.id, pos)
          layoutedNodes.push({
            ...node,
            position: pos,
          })
        }
      } else {
        // Other levels: position children relative to their parents
        // Group nodes by their parent(s)
        const parentGroups = new Map<string, GraphNode[]>()
        for (const node of nodesAtLevel) {
          const nodeParents = parents.get(node.id) || []
          if (nodeParents.length === 0) {
            // No parent, put in "orphan" group
            if (!parentGroups.has('__orphan__')) {
              parentGroups.set('__orphan__', [])
            }
            parentGroups.get('__orphan__')!.push(node)
          } else {
            // Use first parent as primary parent for positioning
            const primaryParent = nodeParents[0]
            if (!parentGroups.has(primaryParent)) {
              parentGroups.set(primaryParent, [])
            }
            parentGroups.get(primaryParent)!.push(node)
          }
        }

        // Position each group relative to its parent
        for (const [parentId, groupNodes] of parentGroups) {
          if (parentId === '__orphan__') {
            // Orphan nodes: position at top
            groupNodes.sort((a, b) => a.id.localeCompare(b.id))
            const totalHeight = groupNodes.length * opts.nodeHeight + (groupNodes.length - 1) * opts.verticalSpacing
            const startY = -totalHeight / 2
            for (let row = 0; row < groupNodes.length; row++) {
              const node = groupNodes[row]
              const pos = {
                x: level * (opts.nodeWidth + opts.horizontalSpacing),
                y: startY + row * (opts.nodeHeight + opts.verticalSpacing),
              }
              nodePositions.set(node.id, pos)
              layoutedNodes.push({
                ...node,
                position: pos,
              })
            }
          } else {
            // Position relative to parent
            const parentPos = nodePositions.get(parentId)
            if (parentPos) {
              groupNodes.sort((a, b) => a.id.localeCompare(b.id))
              const totalHeight = groupNodes.length * opts.nodeHeight + (groupNodes.length - 1) * opts.verticalSpacing
              const startY = parentPos.y - totalHeight / 2 + opts.nodeHeight / 2

              for (let row = 0; row < groupNodes.length; row++) {
                const node = groupNodes[row]
                const pos = {
                  x: level * (opts.nodeWidth + opts.horizontalSpacing),
                  y: startY + row * (opts.nodeHeight + opts.verticalSpacing),
                }
                nodePositions.set(node.id, pos)
                layoutedNodes.push({
                  ...node,
                  position: pos,
                })
              }
            }
          }
        }
      }
    }

    // Add external nodes on the far right
    const externalNodes = nodes.filter((n) => n.data.aiNode.scope === 'external')
    if (externalNodes.length > 0) {
      const externalLevel = maxLevel + 1
      const totalHeight = externalNodes.length * opts.nodeHeight + (externalNodes.length - 1) * opts.verticalSpacing
      const startY = -totalHeight / 2

      externalNodes
        .sort((a, b) => a.id.localeCompare(b.id))
        .forEach((node, row) => {
          layoutedNodes.push({
            ...node,
            position: {
              x: externalLevel * (opts.nodeWidth + opts.horizontalSpacing),
              y: startY + row * (opts.nodeHeight + opts.verticalSpacing),
            },
          })
        })
    }

    console.log('[HierarchicalLayout] Layouted', layoutedNodes.length, 'nodes across', maxLevel + 1, 'levels')

    return { nodes: layoutedNodes, edges }
  }
}
