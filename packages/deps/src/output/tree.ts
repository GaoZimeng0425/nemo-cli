import type { AnalysisResult } from '../core/types.js'

export interface TreeOutputOptions {
  maxDepth?: number
  showPaths: boolean
  showDynamicImports: boolean
}

export class TreeGenerator {
  private analysis: AnalysisResult
  private options: TreeOutputOptions

  constructor(analysis: AnalysisResult, options: Partial<TreeOutputOptions> = {}) {
    this.analysis = analysis
    this.options = {
      maxDepth: options.maxDepth,
      showPaths: options.showPaths ?? false,
      showDynamicImports: options.showDynamicImports ?? true,
    }
  }

  generate(): string {
    const lines: string[] = []

    if (this.analysis.graph.entryPoints.length === 0) {
      lines.push('No entry points found.')
      return lines.join('\n')
    }

    const visited = new Set<string>()

    for (const entryPoint of this.analysis.graph.entryPoints) {
      const tree = this.buildTree(entryPoint, 0, visited)
      lines.push(tree)
      lines.push('')
    }

    if (this.analysis.cycles.length > 0) {
      lines.push('\nCycles detected:')
      for (const cycle of this.analysis.cycles) {
        lines.push(`  ${cycle.join(' -> ')}`)
      }
    }

    const stats = this.analysis.stats
    lines.push('\nStatistics:')
    lines.push(`  Total nodes: ${stats.totalNodes}`)
    lines.push(`  Total edges: ${stats.totalEdges}`)
    lines.push(`  Max depth: ${stats.maxDepth}`)
    lines.push(`  Average dependencies: ${stats.averageDependencies}`)

    return lines.join('\n')
  }

  private buildTree(nodeId: string, depth: number, visited: Set<string>, path: string[] = []): string {
    if (this.options.maxDepth !== undefined && depth > this.options.maxDepth) {
      return ''
    }

    if (visited.has(nodeId)) {
      return `${'  '.repeat(depth)}⚠️ ${nodeId} (already visited)`
    }

    const node = this.analysis.graph.nodes.get(nodeId)
    if (!node) {
      return ''
    }

    const marker = this.getMarker(node, depth)
    const label = this.formatNodeLabel(nodeId, node)
    const prefix = '  '.repeat(depth)
    const result = `${prefix}${marker}${label}`

    if (node.dependencies.size === 0) {
      return result
    }

    visited.add(nodeId)

    const children: string[] = []
    const currentPath = [...path, nodeId]

    for (const depId of node.dependencies) {
      if (node.dynamic && !this.options.showDynamicImports) {
        continue
      }
      children.push(this.buildTree(depId, depth + 1, new Set(visited), currentPath))
    }

    visited.delete(nodeId)

    return [result, ...children].filter(Boolean).join('\n')
  }

  private getMarker(node: any, depth: number): string {
    if (this.analysis.graph.entryPoints.includes(node.id)) {
      return '🚀 '
    }

    if (node.dependencies.size === 0) {
      return '🍃 '
    }

    const branchChars = ['├── ', '└── ', '│   ']
    return branchChars[depth % 3] || '├── '
  }

  private formatNodeLabel(id: string, node: any): string {
    const shortName = id.split('/').pop() ?? id

    if (this.options.showPaths) {
      return `${shortName} (${id})`
    }

    let label = shortName

    if (node.dynamic && this.options.showDynamicImports) {
      label += ' [dynamic]'
    }

    if (node.moduleSystem === 'commonjs') {
      label += ' [CJS]'
    }

    return label
  }
}

export function createTreeGenerator(analysis: AnalysisResult, options?: Partial<TreeOutputOptions>): TreeGenerator {
  return new TreeGenerator(analysis, options)
}

export function generateTreeOutput(analysis: AnalysisResult, options?: Partial<TreeOutputOptions>): string {
  const generator = createTreeGenerator(analysis, options)
  return generator.generate()
}
