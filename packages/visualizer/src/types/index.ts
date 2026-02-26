/**
 * Type definitions for Visualizer
 * Local definitions based on @nemo-cli/deps structure
 */

/**
 * Module system type
 */
export type ModuleSystem = 'es6' | 'commonjs' | 'amd' | 'unknown'

/**
 * Node type classification
 */
export type NodeType = 'page' | 'layout' | 'route' | 'component' | 'util' | 'external' | 'unknown'

/**
 * Node scope
 */
export type NodeScope = 'app' | 'workspace' | 'external' | 'internal'

/**
 * Route type
 */
export type RouteType = 'page' | 'layout' | 'route' | 'error' | 'loading' | 'not-found'

/**
 * AI Node representation
 */
export interface AiNode {
  id: string
  path?: string
  relativePath?: string
  scope: NodeScope
  packageName?: string
  workspacePackage?: string
  moduleSystem: ModuleSystem
  dynamic: boolean
  type: NodeType
  dependencies: string[]
  dependents: string[]
}

/**
 * AI Page representation
 */
export interface AiPage {
  route: string
  routeType: RouteType
  entryFile: string
  layoutChain: string[]
  rootIds: string[]
  nodeIds: string[]
  orderGroups: string[][]
}

/**
 * AI SCC Group
 */
export interface AiSccGroup {
  id: string
  nodes: string[]
}

/**
 * AI Output structure
 */
export interface AiOutput {
  meta: {
    generatedAt: string
    appRoot: string
    appDir: string
    workspaceRoot?: string
    nodeKeyStrategy?: 'relative'
    toolVersion?: string
  }
  nodes: Record<string, AiNode>
  pages: Record<string, AiPage>
  nodeToPages: Record<string, string[]>
  sccs: AiSccGroup[]
  nodeToScc: Record<string, string>
}

// React Flow types
import type { Edge, Node } from 'reactflow'

/**
 * AI Analysis result from nd ai command
 */
export interface ComponentAnalysis {
  id: string
  routes: string[]
  scope: NodeScope
  path?: string
  relativePath?: string
  dependencies: string[]
  dependents: string[]
  analysis: {
    status: 'pending' | 'running' | 'done' | 'skipped' | 'error'
    summary?: string
    content?: string
    model?: string
    engine?: string
    promptVersion: string
    sourceHash?: string
    updatedAt: string
    error?: string
  }
}

/**
 * Extended node data for React Flow
 */
export interface GraphNodeData {
  /** AI node data */
  aiNode: AiNode
  /** Whether this node is in a cycle */
  isInCycle: boolean
  /** SCC group ID if in cycle */
  sccGroupId?: string
  /** Number of dependencies */
  depCount: number
  /** Number of dependents */
  dependentCount: number
  /** Pages this node belongs to */
  pages: string[]
  /** AI analysis result (if available) */
  aiAnalysis?: ComponentAnalysis
}

/**
 * React Flow Node with our custom data
 */
export type GraphNode = Node<GraphNodeData>

/**
 * React Flow Edge (default)
 */
export type GraphEdge = Edge

/**
 * Filter scope options
 */
export type FilterScope = 'app' | 'workspace' | 'external' | 'internal' | 'other'

/**
 * View mode
 */
export type ViewMode = 'all' | 'page' | 'scc'

/**
 * Layout algorithm type
 */
export type LayoutType = 'elk' | 'dagre' | 'force' | 'grid' | 'hierarchical' | 'hierarchical-d3'

/**
 * File opener editor type
 */
export type EditorType = 'vscode' | 'webstorm' | 'cursor' | 'sublime' | 'auto'
