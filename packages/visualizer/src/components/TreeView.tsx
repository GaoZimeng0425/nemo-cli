/**
 * Tree View Component - Hierarchical dependency tree visualization
 */

import { useMemo } from 'react'

import { useGraphStore } from '../store/useGraphStore'
import type { GraphNode } from '../types'
import { TreeNode } from './TreeNode'

// Type for tree node structure
interface TreeDataNode {
  node: GraphNode
  level: number
  isExpanded: boolean
  canExpand: boolean
  hasChildren: boolean
  children: TreeDataNode[]
}

export function TreeView() {
  const { allNodes, allEdges, treeExpandedNodes, filteredScopes, searchQuery, selectNode, aiOutput } = useGraphStore()

  // Build tree structure from nodes and edges
  const treeData: TreeDataNode[] = useMemo(() => {
    // Find entry nodes (nodes with no dependents)
    const entryNodes = allNodes.filter((n) => n.data.dependentCount === 0)

    // Create a map for quick lookup
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]))

    // Create adjacency map for dependencies
    const dependenciesMap = new Map<string, string[]>()
    allEdges.forEach((edge) => {
      if (!dependenciesMap.has(edge.source)) {
        dependenciesMap.set(edge.source, [])
      }
      dependenciesMap.get(edge.source)!.push(edge.target)
    })

    // Filter nodes based on current filters
    const isVisible = (nodeId: string): boolean => {
      const node = nodeMap.get(nodeId)
      if (!node) return false

      // Scope filter
      if (filteredScopes.length > 0 && filteredScopes.length < 5) {
        if (!filteredScopes.includes(node.data.aiNode.scope)) {
          return false
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          node.id.toLowerCase().includes(query) ||
          node.data.aiNode.path?.toLowerCase().includes(query) ||
          node.data.aiNode.relativePath?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      return true
    }

    // Recursively build tree nodes with their children
    const buildTreeNode = (nodeId: string, level: number, visited: Set<string>): TreeDataNode | null => {
      // Prevent cycles
      if (visited.has(nodeId)) {
        return null
      }
      visited.add(nodeId)

      const node = nodeMap.get(nodeId)
      if (!node || !isVisible(nodeId)) {
        return null
      }

      const dependencies = dependenciesMap.get(nodeId) || []
      const visibleDependencies = dependencies.filter((depId) => nodeMap.has(depId) && isVisible(depId))

      return {
        node,
        level,
        isExpanded: treeExpandedNodes.has(nodeId),
        canExpand: visibleDependencies.length > 0 && node.data.aiNode.scope !== 'external',
        hasChildren: visibleDependencies.length > 0,
        children: visibleDependencies
          .map((depId) => buildTreeNode(depId, level + 1, visited))
          .filter(Boolean) as TreeDataNode[],
      }
    }

    // Build tree starting from entry nodes
    return entryNodes
      .map((entryNode) => buildTreeNode(entryNode.id, 0, new Set<string>()))
      .filter(Boolean) as typeof treeData
  }, [allNodes, allEdges, treeExpandedNodes, filteredScopes, searchQuery])

  // Flatten tree for rendering
  const flattenedNodes = useMemo(() => {
    const result: TreeDataNode[] = []

    const flatten = (nodes: TreeDataNode[]) => {
      for (const treeNode of nodes) {
        result.push(treeNode)
        // Only add children if expanded
        if (treeNode.isExpanded && treeNode.children) {
          flatten(treeNode.children)
        }
      }
    }

    flatten(treeData)
    return result
  }, [treeData])

  const handleBackgroundClick = () => {
    selectNode(null)
  }

  if (flattenedNodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="font-medium text-white">没有找到匹配的节点</p>
          <p className="mt-1 text-gray-400 text-sm">请调整过滤器或搜索条件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto" onClick={handleBackgroundClick}>
      <div className="space-y-1 p-4">
        {flattenedNodes.map((treeNode) => (
          <TreeNode
            canExpand={treeNode.canExpand}
            hasChildren={treeNode.hasChildren}
            isExpanded={treeNode.isExpanded}
            key={treeNode.node.id}
            level={treeNode.level}
            node={treeNode.node}
          />
        ))}
      </div>
    </div>
  )
}
