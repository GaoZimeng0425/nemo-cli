import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { stat } from 'node:fs/promises'

import { createCommand, exit } from '@nemo-cli/shared'
import type { ComponentTreeNode, PageCliOptions, PageDependencyOutput } from '../core/types.js'

export function pageCommand() {
  return createCommand('page')
    .description('Query page component tree from generated JSON')
    .argument('<route>', 'Route path (e.g., /dashboard)')
    .option('-f, --from <path>', 'Input JSON file or directory', './deps-output')
    .option('--format <format>', 'Output format (tree, json)', 'tree')
    .action(async (route: string, options: PageCliOptions) => {
      await handlePageCommand(route, options)
    })
}

async function handlePageCommand(route: string, options: PageCliOptions): Promise<void> {
  // 1. Determine input path
  const inputPath = resolvePath(options.from)

  let fileStat
  try {
    fileStat = await stat(inputPath)
  } catch {
    console.error(`Error: Path "${inputPath}" does not exist.`)
    exit(1)
    return
  }

  // 2. Find the JSON file to read
  let jsonPath: string

  if (fileStat.isDirectory()) {
    // Convert route path to filename
    const fileName = route === '/' ? '_' : route.slice(1)
    jsonPath = resolvePath(inputPath, `${fileName}.json`)

    // Check if file exists
    try {
      await stat(jsonPath)
    } catch {
      console.error(`Error: No JSON file found for route "${route}" at "${jsonPath}".`)
      console.error('\nHint: Run `ndeps analyze <project> --output <dir>` first to generate the JSON files.')
      exit(1)
      return
    }
  } else {
    jsonPath = inputPath
  }

  // 3. Read and parse JSON
  let content: string
  let data: PageDependencyOutput

  try {
    content = await readFile(jsonPath, 'utf-8')
    data = JSON.parse(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: "${jsonPath}"`)
    } else {
      console.error(`Error: Failed to parse JSON file: "${jsonPath}"`)
      console.error(`Details: ${(error as Error).message}`)
    }
    exit(1)
    return
  }

  // 4. Output based on format
  if (options.format === 'json') {
    console.log(JSON.stringify(data.tree, null, 2))
  } else {
    // Tree format: use custom formatting
    const treeOutput = formatTree(data.tree, data.route, data.routeType)
    console.log(treeOutput)
  }
}

/**
 * Format component tree as visual tree output
 */
function formatTree(node: ComponentTreeNode, route: string, routeType: string): string {
  const lines: string[] = []

  // Add header
  lines.push(`Route: ${route} (${routeType})`)

  // Format tree recursively
  const formatNode = (n: ComponentTreeNode, depth: number, prefix: string = '') => {
    const shortName = n.id.split('/').pop() || n.id
    const isLast = depth === 0

    if (depth === 0) {
      lines.push(`📄 ${shortName}`)
    } else {
      const connector = prefix.endsWith('└── ') ? '└── ' : '├── '
      lines.push(`${prefix}${connector}${shortName}`)
    }

    // Format children
    for (let i = 0; i < n.children.length; i++) {
      const child = n.children[i]
      if (!child) continue
      const childIsLast = i === n.children.length - 1
      const newPrefix = depth === 0 ? '' : prefix + (prefix.endsWith('└── ') ? '    ' : '│   ')
      formatNode(child, depth + 1, newPrefix)
    }
  }

  formatNode(node, 0)

  return lines.join('\n')
}
