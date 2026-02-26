/**
 * Zustand store for graph visualization state with progressive expansion
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { AiNode, AiOutput, FilterScope, GraphEdge, GraphNode } from '../types'

interface GraphState {
  // Data state
  aiOutput: AiOutput | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  allNodes: GraphNode[] // All nodes (for expansion)
  allEdges: GraphEdge[] // All edges (for expansion)

  // Progressive expansion state
  expandedNodeIds: Set<string>

  // UI state
  selectedNodeId: string | null
  filteredScopes: FilterScope[]
  selectedPageId: string | null
  searchQuery: string
  viewMode: 'all' | 'page' | 'scc'
  isLoading: boolean
  error: string | null

  // Computed helpers
  getFilteredNodes: () => GraphNode[]
  getFilteredEdges: () => GraphEdge[]
  getSelectedNode: () => GraphNode | undefined
  getNodeById: (id: string) => GraphNode | undefined
}

interface GraphActions {
  // Data operations
  loadAiOutput: (output: AiOutput, nodes?: GraphNode[], edges?: GraphEdge[]) => void
  clearData: () => void

  // Progressive expansion
  toggleNodeExpansion: (nodeId: string) => void
  expandNode: (nodeId: string) => void
  collapseNode: (nodeId: string) => void
  expandAll: () => void
  collapseAll: () => void

  // UI operations
  selectNode: (nodeId: string | null) => void
  setFilteredScopes: (scopes: FilterScope[]) => void
  setSelectedPageId: (pageId: string | null) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: 'all' | 'page' | 'scc') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Filter operations
  toggleScopeFilter: (scope: FilterScope) => void
  clearScopeFilters: () => void
  searchNodes: (query: string) => void
}

type GraphStore = GraphState & GraphActions

/**
 * Build React Flow graph from AiOutput
 */
function buildGraph(aiOutput: AiOutput): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Create nodes
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    const sccGroupId = aiOutput.nodeToScc[id]
    const isInCycle = !!sccGroupId

    const node: GraphNode = {
      id,
      type: 'dependencyNode',
      position: { x: 0, y: 0 }, // Will be set by layout algorithm
      data: {
        aiNode,
        isInCycle,
        sccGroupId,
        depCount: (aiNode as AiNode).dependencies.length,
        dependentCount: (aiNode as AiNode).dependents.length,
        pages: aiOutput.nodeToPages[id] || [],
      },
    }

    nodes.push(node)
  }

  // Create edges
  for (const [id, aiNode] of Object.entries(aiOutput.nodes)) {
    for (const depId of (aiNode as AiNode).dependencies) {
      const edge: GraphEdge = {
        id: `${id}->${depId}`,
        source: id,
        target: depId,
        type: 'smoothstep',
        animated: !!(aiOutput.nodeToScc[id] && aiOutput.nodeToScc[id] === aiOutput.nodeToScc[depId]),
      }

      edges.push(edge)
    }
  }

  return { nodes, edges }
}

export const useGraphStore = create<GraphStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      aiOutput: null,
      nodes: [],
      edges: [],
      allNodes: [],
      allEdges: [],
      expandedNodeIds: new Set<string>(),
      selectedNodeId: null,
      filteredScopes: ['app', 'workspace', 'external', 'internal', 'other'],
      selectedPageId: null,
      searchQuery: '',
      viewMode: 'all',
      isLoading: false,
      error: null,

      // Computed helpers
      getFilteredNodes: () => {
        const state = get()
        const { nodes, filteredScopes, selectedPageId, searchQuery, viewMode } = state

        let filtered = nodes

        // Filter by scope
        if (filteredScopes.length > 0 && filteredScopes.length < 5) {
          filtered = filtered.filter((node) => filteredScopes.includes(node.data.aiNode.scope))
        }

        // Filter by page
        if (selectedPageId && state.aiOutput?.pages[selectedPageId]) {
          const page = state.aiOutput.pages[selectedPageId]
          const pageNodeIds = new Set(page.nodeIds)
          filtered = filtered.filter((node) => pageNodeIds.has(node.id))
        }

        // Filter by SCC mode
        if (viewMode === 'scc') {
          filtered = filtered.filter((node) => node.data.isInCycle)
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(
            (node) =>
              node.id.toLowerCase().includes(query) ||
              node.data.aiNode.path?.toLowerCase().includes(query) ||
              node.data.aiNode.relativePath?.toLowerCase().includes(query)
          )
        }

        return filtered
      },

      getFilteredEdges: () => {
        const state = get()
        const filteredNodes = state.getFilteredNodes()
        const nodeIds = new Set(filteredNodes.map((n) => n.id))

        return state.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      },

      getSelectedNode: () => {
        const state = get()
        return state.nodes.find((n) => n.id === state.selectedNodeId)
      },

      getNodeById: (id: string) => {
        return get().nodes.find((n) => n.id === id)
      },

      // Actions
      loadAiOutput: (output: AiOutput, nodes?: GraphNode[], edges?: GraphEdge[]) => {
        // Use provided layouted nodes/edges, or build default
        const graph = nodes && edges ? { nodes, edges } : buildGraph(output)

        // Find entry nodes (nodes with no dependents)
        const entryNodeIds = new Set(graph.nodes.filter((n) => n.data.dependentCount === 0).map((n) => n.id))

        // Initially only show entry nodes
        const entryNodes = graph.nodes.filter((n) => entryNodeIds.has(n.id))
        const entryEdges = graph.edges.filter((e) => entryNodeIds.has(e.source) && entryNodeIds.has(e.target))

        set({
          aiOutput: output,
          nodes: entryNodes,
          edges: entryEdges,
          allNodes: graph.nodes,
          allEdges: graph.edges,
          expandedNodeIds: entryNodeIds,
          error: null,
        })

        console.log('[GraphStore] Initial load - showing entry nodes only:', entryNodeIds.size)
      },

      clearData: () => {
        set({
          aiOutput: null,
          nodes: [],
          edges: [],
          allNodes: [],
          allEdges: [],
          expandedNodeIds: new Set(),
          selectedNodeId: null,
          selectedPageId: null,
          searchQuery: '',
          error: null,
        })
      },

      // Progressive expansion
      toggleNodeExpansion: (nodeId: string) => {
        const state = get()
        const isExpanded = state.expandedNodeIds.has(nodeId)

        if (isExpanded) {
          // Collapse: remove this node and its descendants
          const toRemove = new Set<string>()
          const collectDescendants = (id: string) => {
            toRemove.add(id)
            const node = state.allNodes.find((n) => n.id === id)
            if (node) {
              node.data.aiNode.dependencies.forEach((depId: string) => {
                if (state.expandedNodeIds.has(depId)) {
                  collectDescendants(depId)
                }
              })
            }
          }
          collectDescendants(nodeId)

          const newExpanded = new Set(state.expandedNodeIds)
          toRemove.forEach((id: string) => {
            newExpanded.delete(id)
          })

          console.log('[GraphStore] Collapsed node:', nodeId, 'Removing:', Array.from(toRemove))

          set({
            expandedNodeIds: newExpanded,
            nodes: state.allNodes.filter((n) => newExpanded.has(n.id)),
            edges: state.allEdges.filter((e) => newExpanded.has(e.source) && newExpanded.has(e.target)),
          })
        } else {
          // Expand: add this node's dependencies
          const node = state.allNodes.find((n) => n.id === nodeId)
          if (!node) return

          const newExpanded = new Set(state.expandedNodeIds)
          newExpanded.add(nodeId)

          // Add all descendant nodes that are reachable from expanded nodes
          const toAdd = new Set<string>()
          const collectDescendants = (id: string) => {
            toAdd.add(id)
            const n = state.allNodes.find((node) => node.id === id)
            if (n) {
              n.data.aiNode.dependencies.forEach((depId: string) => {
                if (state.allNodes.find((n) => n.id === depId)) {
                  collectDescendants(depId)
                }
              })
            }
          }

          node.data.aiNode.dependencies.forEach((depId: string) => {
            if (state.allNodes.find((n) => n.id === depId)) {
              collectDescendants(depId)
            }
          })

          toAdd.forEach((id: string) => {
            newExpanded.add(id)
          })

          console.log('[GraphStore] Expanded node:', nodeId, 'Adding:', Array.from(toAdd))

          set({
            expandedNodeIds: newExpanded,
            nodes: state.allNodes.filter((n) => newExpanded.has(n.id)),
            edges: state.allEdges.filter((e) => newExpanded.has(e.source) && newExpanded.has(e.target)),
          })
        }
      },

      expandNode: (nodeId: string) => {
        const state = get()
        if (state.expandedNodeIds.has(nodeId)) return

        get().toggleNodeExpansion(nodeId)
      },

      collapseNode: (nodeId: string) => {
        const state = get()
        if (!state.expandedNodeIds.has(nodeId)) return

        get().toggleNodeExpansion(nodeId)
      },

      expandAll: () => {
        const state = get()
        set({
          expandedNodeIds: new Set(state.allNodes.map((n) => n.id)),
          nodes: state.allNodes,
          edges: state.allEdges,
        })
        console.log('[GraphStore] Expanded all nodes')
      },

      collapseAll: () => {
        const state = get()
        const entryNodeIds = new Set(state.allNodes.filter((n) => n.data.dependentCount === 0).map((n) => n.id))

        set({
          expandedNodeIds: entryNodeIds,
          nodes: state.allNodes.filter((n) => entryNodeIds.has(n.id)),
          edges: state.allEdges.filter((e) => entryNodeIds.has(e.source) && entryNodeIds.has(e.target)),
        })
        console.log('[GraphStore] Collapsed to entry nodes only:', entryNodeIds.size)
      },

      selectNode: (nodeId: string | null) => {
        set({ selectedNodeId: nodeId })
      },

      setFilteredScopes: (scopes: FilterScope[]) => {
        set({ filteredScopes: scopes })
      },

      setSelectedPageId: (pageId: string | null) => {
        set({ selectedPageId: pageId })
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query })
      },

      setViewMode: (mode: 'all' | 'page' | 'scc') => {
        set({ viewMode: mode })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      toggleScopeFilter: (scope: FilterScope) => {
        const state = get()
        const newScopes = state.filteredScopes.includes(scope)
          ? state.filteredScopes.filter((s) => s !== scope)
          : [...state.filteredScopes, scope]

        // Don't allow empty filter
        if (newScopes.length > 0) {
          set({ filteredScopes: newScopes })
        }
      },

      clearScopeFilters: () => {
        set({ filteredScopes: ['app', 'workspace', 'external', 'internal', 'other'] })
      },

      searchNodes: (query: string) => {
        set({ searchQuery: query })
      },
    }),
    { name: 'GraphStore' }
  )
)
