/**
 * Type definitions for dependency analysis
 */

/**
 * Represents a dependency node in the graph
 */
export interface DependencyNode {
  /** Unique identifier for the node (file path or module name) */
  id: string

  /** Set of nodes this node depends on */
  dependencies: Set<string>

  /** Set of nodes that depend on this node */
  dependents: Set<string>

  /** Module system type */
  moduleSystem: ModuleSystem

  /** Whether this is a dynamic import */
  dynamic: boolean

  /** Type of file/node */
  type: NodeType
}

/**
 * Module system type
 */
export type ModuleSystem = 'es6' | 'commonjs' | 'amd' | 'unknown'

/**
 * Node type classification
 */
export type NodeType = 'page' | 'layout' | 'route' | 'component' | 'util' | 'external' | 'unknown'

/**
 * Next.js App Router specific metadata
 */
export interface NextJsRouteMetadata {
  /** Route path (e.g., '/', '/dashboard', '/api/users') */
  routePath: string

  /** Route type */
  routeType: 'page' | 'layout' | 'route' | 'loading' | 'error' | 'not-found'

  /** File path */
  filePath: string

  /** Whether this is a dynamic route (e.g., [slug]) */
  isDynamic: boolean

  /** Whether this is a catch-all route (e.g., [...slug]) */
  isCatchAll: boolean
}

/**
 * Dependency graph data structure
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: Map<string, DependencyNode>

  /** Edges: from -> to set */
  edges: Map<string, Set<string>>

  /** Next.js routes metadata (if analyzing Next.js project) */
  routes?: Map<string, NextJsRouteMetadata>

  /** Root entry points */
  entryPoints: string[]
}

/**
 * Import/require dependency extracted from AST
 */
export interface ExtractedDependency {
  /** Module path or name */
  module: string

  /** Module system used */
  moduleSystem: ModuleSystem

  /** Whether this is a dynamic import */
  dynamic: boolean

  /** Dependency type classification */
  type: 'import' | 'require' | 'dynamic-import' | 'export-from' | 're-export'

  /** Line number in source file */
  line: number

  /** Column number in source file */
  column: number
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** Base directory for resolving paths */
  basePath: string

  /** Whether to include type-only imports */
  includeTypeImports: boolean

  /** Whether to follow external dependencies */
  followExternal: boolean

  /** Maximum depth for dependency resolution */
  maxDepth?: number

  /** Extensions to include in analysis */
  extensions: string[]

  /** Optional workspace package map (package name -> absolute path) */
  workspacePackages?: Map<string, string>
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  /** The dependency graph */
  graph: DependencyGraph

  /** Detected cycles */
  cycles: string[][]

  /** Leaf nodes (nodes with no dependencies) */
  leaves: string[]

  /** Orphan nodes (nodes with no dependents) */
  orphans: string[]

  /** Topologically sorted nodes */
  topologicalOrder: string[]

  /** Statistics */
  stats: {
    totalNodes: number
    totalEdges: number
    maxDepth: number
    averageDependencies: number
  }
}

/**
 * Output format type
 */
export type OutputFormat = 'dot' | 'json' | 'tree' | 'text' | 'ai'

/**
 * CLI options
 */
export interface CliOptions {
  /** Path to analyze */
  path: string

  /** Output format */
  format: OutputFormat

  /** Output file path (optional) */
  output?: string

  /** Specific route to analyze (for Next.js) */
  route?: string

  /** Whether to show only leaf nodes */
  leaves?: boolean

  /** Whether to show only orphan nodes */
  orphans?: boolean

  /** Whether to detect cycles */
  cycles?: boolean

  /** Maximum depth */
  maxDepth?: number

  /** Whether to follow external dependencies */
  external?: boolean

  /** Verbose output */
  verbose?: boolean
}

/**
 * Route type enumeration for Next.js App Router
 */
export type RouteType = 'page' | 'layout' | 'route' | 'error' | 'loading' | 'not-found'

/**
 * Component tree node with recursive structure for page dependency output
 */
export interface ComponentTreeNode {
  /** Unique identifier (file path) */
  id: string
  /** Node type classification */
  type: NodeType
  /** Relative path from project root */
  path: string
  /** Child dependencies (recursive structure, empty array for leaf nodes) */
  children: ComponentTreeNode[]
  /** Extension field for future use */
  _extensions?: Record<string, unknown>
}

/**
 * Statistics for a single page dependency analysis
 */
export interface PageStats {
  /** Total number of components in the tree */
  totalComponents: number
  /** Maximum depth of the dependency tree */
  maxDepth: number
  /** Whether dynamic imports are present */
  hasDynamicImports: boolean
  /** Whether server components are detected */
  hasServerComponents: boolean
  /** ISO timestamp of generation */
  generatedAt: string
}

/**
 * Output structure for a single page/entry point dependency analysis
 */
export interface PageDependencyOutput {
  /** Route path (e.g., '/dashboard', '/api/users') */
  route: string
  /** Route type */
  routeType: RouteType
  /** Entry point file path */
  entryFile: string
  /** Component tree with recursive structure */
  tree: ComponentTreeNode
  /** Statistics about this page */
  stats: PageStats
  /** Extension field for future use */
  _extensions?: Record<string, unknown>
}

/**
 * Extended CLI options for analyze command with per-entry output support
 */
export interface AnalyzeCliOptions extends CliOptions {
  /** Output directory (instead of single file) */
  output?: string
  /** Whether to split output per entry point (default: true) */
  perEntry?: boolean
  /** Whether to write ai-docs/deps.ai.json side output */
  aiJson?: boolean
}

/**
 * CLI options for page command
 */
export interface PageCliOptions {
  /** Input JSON file or directory path */
  from: string
  /** Output format (tree or json) */
  format: 'tree' | 'json'
}

/**
 * AI-friendly output types
 */
export type NodeScope = 'app' | 'workspace' | 'external' | 'internal'

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

export interface AiPage {
  route: string
  routeType: RouteType
  entryFile: string
  layoutChain: string[]
  /** Root node ids (entry + layouts) */
  rootIds: string[]
  nodeIds: string[]
  orderGroups: string[][]
}

export interface AiSccGroup {
  id: string
  nodes: string[]
}

export interface AiOutput {
  meta: {
    generatedAt: string
    appRoot: string
    appDir: string
    workspaceRoot?: string
    toolVersion?: string
  }
  nodes: Record<string, AiNode>
  pages: Record<string, AiPage>
  nodeToPages: Record<string, string[]>
  sccs: AiSccGroup[]
  nodeToScc: Record<string, string>
}
