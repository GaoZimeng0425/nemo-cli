import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type {
  ComponentTreeNode,
  DependencyGraph,
  NextJsRouteMetadata,
  PageDependencyOutput,
  PageStats,
  RouteType,
} from '../core/types'

export interface PageJsonGeneratorOptions {
  /** Pretty print JSON output */
  pretty?: boolean
}

export class PageJsonGenerator {
  private graph: DependencyGraph
  private routes: Map<string, NextJsRouteMetadata>
  private options: PageJsonGeneratorOptions

  constructor(
    graph: DependencyGraph,
    routes: Map<string, NextJsRouteMetadata>,
    options: PageJsonGeneratorOptions = {}
  ) {
    this.graph = graph
    this.routes = routes
    this.options = {
      pretty: options.pretty ?? true,
    }
  }

  /**
   * Generate JSON files for all entry points and write to the specified directory
   * @returns Array of generated file paths
   */
  async generateToDirectory(outputDir: string): Promise<string[]> {
    const files: string[] = []

    for (const [filePath, routeMeta] of this.routes) {
      const output = this.generateForEntry(filePath)
      const relativePath = this.routeToFilePath(routeMeta.routePath, routeMeta.routeType)
      const fullPath = join(outputDir, relativePath)

      // Create nested directories if needed
      await mkdir(dirname(fullPath), { recursive: true })

      const jsonContent = JSON.stringify(output, null, this.options.pretty ? 2 : 0)
      await writeFile(fullPath, jsonContent, 'utf-8')

      files.push(fullPath)
    }

    return files
  }

  /**
   * Generate JSON output for a single entry point
   */
  generateForEntry(entryFile: string): PageDependencyOutput {
    const routeMeta = this.routes.get(entryFile)
    const tree = this.buildTree(entryFile, new Set())

    return {
      route: routeMeta?.routePath || '/',
      routeType: routeMeta?.routeType || 'page',
      entryFile,
      tree,
      stats: this.calculateStats(tree),
    }
  }

  /**
   * Build component tree with recursive structure
   * @param nodeId - Node identifier to start from
   * @param visited - Set of visited nodes to prevent cycles
   * @returns Component tree node
   */
  buildTree(nodeId: string, visited: Set<string>): ComponentTreeNode {
    // Handle circular dependency
    if (visited.has(nodeId)) {
      return { id: nodeId, type: 'component', path: nodeId, children: [] }
    }

    visited.add(nodeId)

    const node = this.graph.nodes.get(nodeId)
    const children: ComponentTreeNode[] = []

    // Recursively build children
    for (const depId of node?.dependencies || []) {
      const childNode = this.buildTree(depId, new Set(visited))
      children.push(childNode)
    }

    return {
      id: nodeId,
      type: node?.type || 'unknown',
      path: nodeId,
      children,
    }
  }

  /**
   * Convert route path to file path
   * Examples:
   * - '/' -> '_'
   * - '/dashboard' -> 'dashboard'
   * - '/api/users' -> 'api/users'
   * - layout -> add '.layout' suffix
   */
  routeToFilePath(route: string, routeType: RouteType): string {
    // Convert route path to base filename
    let base = route === '/' ? '_' : route.slice(1)

    // Add suffix for layout, error, loading, not-found (but not for route or page)
    if (routeType === 'layout' || routeType === 'error' || routeType === 'loading' || routeType === 'not-found') {
      base += `.${routeType}`
    }

    return `${base}.json`
  }

  /**
   * Calculate statistics for the component tree
   */
  private calculateStats(tree: ComponentTreeNode): PageStats {
    let totalComponents = 0
    let maxDepth = 0
    let hasDynamicImports = false
    const hasServerComponents = false

    const traverse = (node: ComponentTreeNode, depth: number) => {
      totalComponents++
      maxDepth = Math.max(maxDepth, depth)

      // Check for dynamic imports in the graph
      const graphNode = this.graph.nodes.get(node.id)
      if (graphNode?.dynamic) {
        hasDynamicImports = true
      }

      // Check for server components (heuristic: files without . extension are likely pages/layouts)
      // Server components in Next.js don't have "use client" directive
      // This is a simplified check - full implementation would parse the file content
      if (node.id.endsWith('.tsx') || node.id.endsWith('.ts')) {
        // We can't detect server components without parsing file content
        // This is a placeholder for future enhancement
      }

      for (const child of node.children) {
        traverse(child, depth + 1)
      }
    }

    traverse(tree, 0)

    return {
      totalComponents,
      maxDepth,
      hasDynamicImports,
      hasServerComponents,
      generatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Factory function to create PageJsonGenerator
 */
export function createPageJsonGenerator(
  graph: DependencyGraph,
  routes: Map<string, NextJsRouteMetadata>,
  options?: PageJsonGeneratorOptions
): PageJsonGenerator {
  return new PageJsonGenerator(graph, routes, options)
}

/**
 * Convenience function to generate page JSON output to directory
 */
export async function generatePageJsonOutput(
  graph: DependencyGraph,
  routes: Map<string, NextJsRouteMetadata>,
  outputDir: string,
  options?: PageJsonGeneratorOptions
): Promise<string[]> {
  const generator = createPageJsonGenerator(graph, routes, options)
  return generator.generateToDirectory(outputDir)
}
