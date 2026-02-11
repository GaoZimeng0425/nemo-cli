import type { AnalysisResult, DependencyNode } from '../core/types'

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
      lines.push(`\n${'='.repeat(80)}`)
      lines.push(`⚠️  检测到 ${this.analysis.cycles.length} 个循环依赖`)
      lines.push('='.repeat(80))

      this.analysis.cycles.forEach((cycle, index) => {
        if (index >= 5) {
          // 只显示前5个循环，避免输出过长
          return
        }

        lines.push(`\n🔴 循环 #${index + 1}`)
        lines.push('─'.repeat(80))

        cycle.forEach((filePath, i) => {
          const fileName = filePath.split('/').pop()
          const isLast = i === cycle.length - 1

          if (i === 0) {
            lines.push(`  ┌── ${fileName}`)
          } else if (isLast) {
            lines.push(`  └── ${fileName} ⬆️`)
          } else {
            lines.push(`  ├── ${fileName}`)
          }
        })

        const cycleSize = cycle.length
        let severity = '🟢 低'
        if (cycleSize >= 2 && cycleSize <= 3) {
          severity = '🟡 中'
        } else if (cycleSize > 3) {
          severity = '🔴 高'
        }

        lines.push(`  严重程度: ${severity} (涉及 ${cycleSize} 个文件)`)
      })

      if (this.analysis.cycles.length > 5) {
        lines.push(`\n... 还有 ${this.analysis.cycles.length - 5} 个循环依赖未显示`)
      }

      lines.push(`\n${'='.repeat(80)}`)
      lines.push('\n💡 解决方案:\n')
      lines.push('1. 📦 提取共同依赖到一个新模块')
      lines.push('2. 🔀 使用依赖注入代替直接导入')
      lines.push('3. 📤 使用事件系统解耦 (EventEmitter)')
      lines.push('4. 🎯 重新设计模块职责边界')
      lines.push('5. 📋 延迟加载 (动态 import)')
      lines.push('6. 🔁 使用接口/抽象层')
      lines.push('')
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

  private getMarker(node: DependencyNode, depth: number): string {
    if (this.analysis.graph.entryPoints.includes(node.id)) {
      return '🚀 '
    }

    if (node.dependencies.size === 0) {
      return '🍃 '
    }

    const branchChars = ['├── ', '└── ', '│   ']
    return branchChars[depth % 3] || '├── '
  }

  private formatNodeLabel(id: string, node: DependencyNode): string {
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
