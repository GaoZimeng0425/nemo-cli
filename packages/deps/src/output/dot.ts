import type { AnalysisResult, DependencyGraph, DependencyNode } from '../core/types'

export interface DotOutputOptions {
  showCycles: boolean
  showLeaves: boolean
  showOrphans: boolean
  direction: 'TB' | 'LR' | 'BT' | 'RL'
  clusterRoutes: boolean
}

export class DotGenerator {
  private graph: DependencyGraph
  private cycles: string[][]
  private options: DotOutputOptions

  constructor(analysis: AnalysisResult, options: Partial<DotOutputOptions> = {}) {
    this.graph = analysis.graph
    this.cycles = analysis.cycles
    this.options = {
      showCycles: options.showCycles ?? false,
      showLeaves: options.showLeaves ?? false,
      showOrphans: options.showOrphans ?? false,
      direction: options.direction ?? 'TB',
      clusterRoutes: options.clusterRoutes ?? false,
    }
  }

  generate(): string {
    const lines: string[] = []

    lines.push('digraph dependencies {')
    lines.push(`  rankdir=${this.options.direction};`)
    lines.push('  node [shape=box, style=rounded];')

    const highlightedNodes = this.getHighlightedNodes()

    for (const [id, node] of this.graph.nodes) {
      const attrs: string[] = []

      if (node.moduleSystem === 'commonjs') {
        attrs.push('style=dashed')
      }

      if (highlightedNodes.includes(id)) {
        attrs.push('fillcolor="#ff6c60"')
        attrs.push('style=filled')
      }

      const label = this.formatNodeLabel(id, node)
      lines.push(`  "${this.escape(id)}" [${attrs.join(', ')} label="${label}"];`)
    }

    for (const [from, tos] of this.graph.edges) {
      for (const to of tos) {
        lines.push(`  "${this.escape(from)}" -> "${this.escape(to)}";`)
      }
    }

    if (this.options.showCycles && this.cycles.length > 0) {
      lines.push('  edge [color="#ff6c60", style=dashed, penwidth=2];')
      for (const cycle of this.cycles) {
        for (let i = 0; i < cycle.length; i++) {
          const from = cycle[i]
          const to = cycle[(i + 1) % cycle.length]
          lines.push(`    "${this.escape(from || '')}" -> "${this.escape(to || '')}";`)
        }
      }
    }

    lines.push('}')

    return lines.join('\n')
  }

  private getHighlightedNodes(): string[] {
    const highlighted: string[] = []

    if (this.options.showLeaves) {
      for (const [id, node] of this.graph.nodes) {
        if (node.dependencies.size === 0) {
          highlighted.push(id)
        }
      }
    }

    if (this.options.showOrphans) {
      for (const [id, node] of this.graph.nodes) {
        if (node.dependents.size === 0 && !this.graph.entryPoints.includes(id)) {
          highlighted.push(id)
        }
      }
    }

    if (this.options.showCycles) {
      for (const cycle of this.cycles) {
        highlighted.push(...cycle)
      }
    }

    return Array.from(new Set(highlighted))
  }

  private formatNodeLabel(id: string, _node: DependencyNode): string {
    const maxLength = 30
    const shortName = id.split('/').pop() || id

    if (shortName.length <= maxLength) {
      return this.escape(shortName)
    }

    return this.escape(`${shortName.slice(0, maxLength - 3)}...`)
  }

  private escape(text: string): string {
    return text.replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }
}

export function createDotGenerator(analysis: AnalysisResult, options?: Partial<DotOutputOptions>): DotGenerator {
  return new DotGenerator(analysis, options)
}

export function generateDotOutput(analysis: AnalysisResult, options?: Partial<DotOutputOptions>): string {
  const generator = createDotGenerator(analysis, options)
  return generator.generate()
}
