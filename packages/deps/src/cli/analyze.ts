import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { writeFile } from 'node:fs/promises'

import { createCommand, exit } from '@nemo-cli/shared'
import { createAnalyzer } from '../core/analyzer.js'
import { createGraphBuilder } from '../core/graph.js'
import { createRouteScanner } from '../core/nextjs.js'
import { createParser } from '../core/parser.js'
import type { AnalyzeCliOptions, CliOptions, OutputFormat } from '../core/types.js'
import { generateDotOutput } from '../output/dot.js'
import { generateJsonOutput } from '../output/json.js'
import { generatePageJsonOutput } from '../output/json-page.js'
import { generateTreeOutput } from '../output/tree.js'

export function analyzeCommand() {
  const command = createCommand('analyze')
    .description('Analyze dependencies of a project')
    .argument('<path>', 'Path to the project to analyze')
    .option('-f, --format <format>', 'Output format (dot, json, tree)', 'tree')
    .option('-o, --output <path>', 'Output file or directory path')
    .option('-r, --route <path>', 'Analyze specific Next.js route')
    .option('--leaves', 'Show only leaf nodes')
    .option('--orphans', 'Show only orphan nodes')
    .option('--cycles', 'Highlight cycles in output')
    .option('--max-depth <number>', 'Maximum depth to analyze')
    .option('--external', 'Follow external dependencies')
    .option('--verbose', 'Verbose output')
    .action(async (path: string, options: any) => {
      await analyzeDependencies(path, options as AnalyzeCliOptions)
    })

  return command
}

async function analyzeDependencies(projectPath: string, options: AnalyzeCliOptions): Promise<void> {
  const resolvedPath = resolvePath(projectPath)

  if (!existsSync(resolvedPath)) {
    console.error(`Error: Path "${resolvedPath}" does not exist.`)
    exit(1)
  }

  const startTime = Date.now()

  if (options.verbose) {
    console.log(`Analyzing: ${resolvedPath}`)
  }

  try {
    const parser = createParser({
      basePath: resolvedPath,
      includeTypeImports: false,
      followExternal: options.external ?? false,
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    const graphBuilder = createGraphBuilder()

    const isNextJsProject = existsSync(resolvePath(resolvedPath, 'app'))

    let entryPoints: string[] = []

    if (isNextJsProject) {
      const routeScanner = createRouteScanner(resolvedPath)
      entryPoints = await routeScanner.getRouteFiles()

      if (options.verbose) {
        console.log(`Found Next.js App Router with ${entryPoints.length} routes`)
      }

      if (options.route) {
        entryPoints = entryPoints.filter((file: string) => file.includes(options.route || ''))
      }
    } else {
      const mainFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'main.ts', 'main.tsx', 'main.js', 'main.jsx']

      for (const mainFile of mainFiles) {
        const mainPath = resolvePath(resolvedPath, mainFile)
        if (existsSync(mainPath)) {
          entryPoints.push(mainPath)
          break
        }
      }

      if (entryPoints.length === 0 && existsSync(resolvePath(resolvedPath, 'src'))) {
        const srcPath = resolvePath(resolvedPath, 'src')
        for (const mainFile of mainFiles) {
          const mainPath = resolvePath(srcPath, mainFile)
          if (existsSync(mainPath)) {
            entryPoints.push(mainPath)
            break
          }
        }
      }
    }

    if (entryPoints.length === 0) {
      console.error('Error: No entry points found.')
      exit(1)
    }

    for (const entryPoint of entryPoints) {
      const node = graphBuilder.addNode(entryPoint, 'es6', 'page')
      graphBuilder.markAsEntryPoint(entryPoint)

      if (options.verbose) {
        console.log(`Processing entry point: ${entryPoint}`)
      }

      await processFile(entryPoint, parser, graphBuilder, options)
    }

    const graph = graphBuilder.getGraph()

    let routes = new Map()
    if (isNextJsProject) {
      const routeScanner = createRouteScanner(resolvedPath)
      routes = await routeScanner.scanRoutes()
      graph.routes = routes
    }

    const analyzer = createAnalyzer(graph)
    const analysisResult = analyzer.analyze()

    // Check if per-entry output is requested (default for Next.js projects)
    const perEntry = options.perEntry ?? (isNextJsProject && options.output && options.format === 'json')

    if (perEntry && isNextJsProject && routes.size > 0) {
      // Use PageJsonGenerator for per-entry output
      const outputDir = options.output || './deps-output'

      // Create output directory if it doesn't exist
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true })
      }

      const files = await generatePageJsonOutput(graph, routes, outputDir, {
        pretty: true,
      })

      console.log(`Generated ${files.length} JSON files in: ${outputDir}`)

      if (options.verbose) {
        for (const file of files) {
          console.log(`  - ${file}`)
        }
      }
    } else {
      // Use existing output format
      const output = formatOutput(analysisResult, options)

      if (options.output) {
        await writeFile(options.output, output, 'utf-8')
        console.log(`Output written to: ${options.output}`)
      } else {
        console.log(output)
      }
    }

    const elapsed = Date.now() - startTime
    if (options.verbose) {
      console.log(`\nAnalysis completed in ${(elapsed / 1000).toFixed(2)}s`)
    }

    if (analysisResult.cycles.length > 0) {
      console.warn(`\nWarning: ${analysisResult.cycles.length} cycle(s) detected!`)
    }
  } catch (error) {
    console.error('Error during analysis:', error)
    exit(1)
  }
}

async function processFile(
  filePath: string,
  parser: any,
  graphBuilder: any,
  options: CliOptions,
  depth = 0,
  visited = new Set<string>()
): Promise<void> {
  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return
  }

  if (visited.has(filePath)) {
    return
  }

  visited.add(filePath)

  const dependencies = await parser.parseFile(filePath)

  for (const dep of dependencies) {
    const resolved = parser.resolveModule(dep.module, filePath)

    if (resolved) {
      if (!graphBuilder.getNode(resolved)) {
        graphBuilder.addNode(resolved, dep.moduleSystem, 'component', dep.dynamic)
      }

      graphBuilder.addEdge(filePath, resolved)

      await processFile(resolved, parser, graphBuilder, options, depth + 1, new Set(visited))
    }
  }
}

function formatOutput(analysisResult: any, options: CliOptions): string {
  const format: OutputFormat = options.format || 'tree'

  switch (format) {
    case 'dot':
      return generateDotOutput(analysisResult, {
        showCycles: options.cycles,
        showLeaves: options.leaves,
        showOrphans: options.orphans,
      })

    case 'json':
      return generateJsonOutput(analysisResult, {
        pretty: true,
        includeStats: true,
        includeRoutes: true,
      })

    case 'tree':
    default:
      return generateTreeOutput(analysisResult, {
        maxDepth: options.maxDepth,
        showPaths: options.verbose,
        showDynamicImports: true,
      })
  }
}
