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

  // AI docs base path (extracted from deps.ai.json meta.appRoot)
  aiDocsBasePath: string | null

  // UI state
  selectedNodeId: string | null
  selectedEntryNodeId: string | null // Currently selected entry node for focus view
  filteredScopes: FilterScope[]
  selectedPageId: string | null
  searchQuery: string
  viewMode: 'all' | 'page' | 'scc'
  displayMode: 'graph' | 'tree' // Graph view or tree view
  isLoading: boolean
  error: string | null

  // Tree view state
  treeExpandedNodes: Set<string> // Expanded nodes in tree view

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
  selectEntryNode: (entryNodeId: string | null) => void // Select entry node to focus
  resetEntrySelection: () => void // Reset to show all entry nodes
  setFilteredScopes: (scopes: FilterScope[]) => void
  setSelectedPageId: (pageId: string | null) => void
  setSearchQuery: (query: string) => void
  setViewMode: (mode: 'all' | 'page' | 'scc') => void
  setDisplayMode: (mode: 'graph' | 'tree') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Tree view operations
  toggleTreeNode: (nodeId: string) => void

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
      aiDocsBasePath: null,
      selectedNodeId: null,
      selectedEntryNodeId: null, // No entry node selected initially
      filteredScopes: ['app', 'workspace', 'external', 'internal', 'other'],
      selectedPageId: null,
      searchQuery: '',
      viewMode: 'all',
      displayMode: 'graph', // Default to graph view
      isLoading: false,
      error: null,
      treeExpandedNodes: new Set<string>(),

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

        // The ai-docs path is served by Vite at /ai-docs (not the absolute file system path)
        // This is because browsers can only access paths through the web server
        const aiDocsBasePath = '/ai-docs'

        console.log('[GraphStore] Project info:', {
          appRoot: output.meta.appRoot,
          aiDocsBasePath,
          generatedAt: output.meta.generatedAt,
        })

        set({
          aiOutput: output,
          nodes: entryNodes,
          edges: entryEdges,
          allNodes: graph.nodes,
          allEdges: graph.edges,
          expandedNodeIds: entryNodeIds,
          aiDocsBasePath,
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
          treeExpandedNodes: new Set(),
          aiDocsBasePath: null,
          selectedNodeId: null,
          selectedEntryNodeId: null,
          selectedPageId: null,
          searchQuery: '',
          displayMode: 'graph',
          error: null,
        })
      },

      // Progressive expansion - only expand/collapse immediate dependencies
      toggleNodeExpansion: (nodeId: string) => {
        const state = get()
        const node = state.allNodes.find((n) => n.id === nodeId)
        if (!node) return

        // Check if any direct dependencies are currently visible
        const directDeps = node.data.aiNode.dependencies.filter((depId) => state.allNodes.find((n) => n.id === depId))
        const hasVisibleDeps = directDeps.some((depId) => state.expandedNodeIds.has(depId))

        const newExpanded = new Set(state.expandedNodeIds)

        if (hasVisibleDeps) {
          // Collapse: remove direct dependencies and their descendants
          const toRemove = new Set<string>()
          const collectDescendants = (id: string) => {
            toRemove.add(id)
            const n = state.allNodes.find((node) => node.id === id)
            if (n) {
              n.data.aiNode.dependencies.forEach((depId: string) => {
                if (newExpanded.has(depId)) {
                  // Only collect if this child doesn't have other expanded parents
                  const hasOtherExpandedParents = state.allEdges.some(
                    (e) => e.target === depId && e.source !== id && newExpanded.has(e.source) && !toRemove.has(e.source)
                  )
                  if (!hasOtherExpandedParents) {
                    collectDescendants(depId)
                  }
                }
              })
            }
          }

          // Collect all direct dependencies and their descendants
          for (const depId of directDeps) {
            if (newExpanded.has(depId)) {
              collectDescendants(depId)
            }
          }

          toRemove.forEach((id: string) => {
            newExpanded.delete(id)
          })

          console.log('[GraphStore] Collapsed dependencies of:', nodeId, 'Removing:', Array.from(toRemove))

          set({
            expandedNodeIds: newExpanded,
            nodes: state.allNodes.filter((n) => newExpanded.has(n.id)),
            edges: state.allEdges.filter((e) => newExpanded.has(e.source) && newExpanded.has(e.target)),
          })
        } else {
          // Expand: add direct dependencies
          for (const depId of directDeps) {
            newExpanded.add(depId)
          }

          console.log('[GraphStore] Expanded dependencies of:', nodeId, 'Adding:', directDeps)

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

      selectEntryNode: (entryNodeId: string | null) => {
        const state = get()
        if (!entryNodeId) {
          // If null, just reset the selection (but keep current nodes)
          set({ selectedEntryNodeId: null })
          return
        }

        const entryNode = state.allNodes.find((n) => n.id === entryNodeId)
        if (!entryNode) return

        // Set the selected entry node
        set({ selectedEntryNodeId: entryNodeId })

        // Clear expanded nodes and only show this entry node
        const newExpanded = new Set<string>()
        newExpanded.add(entryNodeId)

        console.log('[GraphStore] Selected entry node:', entryNodeId, 'Hiding other entry nodes')

        set({
          expandedNodeIds: newExpanded,
          nodes: state.allNodes.filter((n) => newExpanded.has(n.id)),
          edges: state.allEdges.filter((e) => newExpanded.has(e.source) && newExpanded.has(e.target)),
        })
      },

      resetEntrySelection: () => {
        const state = get()
        // Find all entry nodes
        const entryNodeIds = new Set(state.allNodes.filter((n) => n.data.dependentCount === 0).map((n) => n.id))

        console.log('[GraphStore] Reset to show all entry nodes:', entryNodeIds.size)

        set({
          selectedEntryNodeId: null,
          expandedNodeIds: entryNodeIds,
          nodes: state.allNodes.filter((n) => entryNodeIds.has(n.id)),
          edges: state.allEdges.filter((e) => entryNodeIds.has(e.source) && entryNodeIds.has(e.target)),
        })
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

      setDisplayMode: (mode: 'graph' | 'tree') => {
        set({ displayMode: mode })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      toggleTreeNode: (nodeId: string) => {
        const state = get()
        const newExpanded = new Set(state.treeExpandedNodes)
        if (newExpanded.has(nodeId)) {
          newExpanded.delete(nodeId)
        } else {
          newExpanded.add(nodeId)
        }
        set({ treeExpandedNodes: newExpanded })
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
