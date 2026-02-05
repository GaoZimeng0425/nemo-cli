import type { AnalysisResult } from '../core/types.js'

export interface JsonOutputOptions {
  pretty: boolean
  includeStats: boolean
  includeRoutes: boolean
}

export class JsonGenerator {
  private analysis: AnalysisResult
  private options: JsonOutputOptions

  constructor(analysis: AnalysisResult, options: Partial<JsonOutputOptions> = {}) {
    this.analysis = analysis
    this.options = {
      pretty: options.pretty ?? true,
      includeStats: options.includeStats ?? true,
      includeRoutes: options.includeRoutes ?? false,
    }
  }

  generate(): string {
    const output: Record<string, any> = {
      nodes: this.serializeNodes(),
      edges: this.serializeEdges(),
    }

    if (this.options.includeStats) {
      output.stats = this.analysis.stats
    }

    if (this.analysis.cycles.length > 0) {
      output.cycles = this.analysis.cycles
    }

    if (this.options.includeRoutes && this.analysis.graph.routes) {
      output.routes = this.serializeRoutes()
    }

    const indent = this.options.pretty ? 2 : 0
    return JSON.stringify(output, null, indent)
  }

  private serializeNodes(): Record<string, any> {
    const nodes: Record<string, any> = {}

    for (const [id, node] of this.analysis.graph.nodes) {
      nodes[id] = {
        id,
        moduleSystem: node.moduleSystem,
        dynamic: node.dynamic,
        type: node.type,
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
        isEntryPoint: this.analysis.graph.entryPoints.includes(id),
      }
    }

    return nodes
  }

  private serializeEdges(): Array<{ from: string; to: string }> {
    const edges: Array<{ from: string; to: string }> = []

    for (const [from, tos] of this.analysis.graph.edges) {
      for (const to of tos) {
        edges.push({ from, to })
      }
    }

    return edges
  }

  private serializeRoutes(): Record<string, any> {
    const routes: Record<string, any> = {}

    if (!this.analysis.graph.routes) {
      return routes
    }

    for (const [filePath, metadata] of this.analysis.graph.routes) {
      routes[filePath] = {
        routePath: metadata.routePath,
        routeType: metadata.routeType,
        isDynamic: metadata.isDynamic,
        isCatchAll: metadata.isCatchAll,
      }
    }

    return routes
  }
}

export function createJsonGenerator(analysis: AnalysisResult, options?: Partial<JsonOutputOptions>): JsonGenerator {
  return new JsonGenerator(analysis, options)
}

export function generateJsonOutput(analysis: AnalysisResult, options?: Partial<JsonOutputOptions>): string {
  const generator = createJsonGenerator(analysis, options)
  return generator.generate()
}
