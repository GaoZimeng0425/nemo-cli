import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve as resolvePath } from 'node:path'

import { createCommand, exit, getWorkspaceDirs } from '@nemo-cli/shared'
import { createAnalyzer } from '../core/analyzer'
import { createGraphBuilder, type GraphBuilder } from '../core/graph'
import { createRouteScanner } from '../core/nextjs'
import { createParser, type Parser } from '../core/parser'
import type { AnalysisResult, AnalyzeCliOptions, CliOptions, OutputFormat } from '../core/types'
import { generateAiOutput } from '../output/ai'
import { generateDotOutput } from '../output/dot'
import { generateJsonOutput } from '../output/json'
import { generatePageJsonOutput } from '../output/json-page'
import { generateTreeOutput } from '../output/tree'
import { resolveWorkspaceProjectPath } from './project-resolver'

export function analyzeCommand() {
  const command = createCommand('analyze')
    .description('Analyze dependencies of a project')
    .argument('[path]', 'Path to the project to analyze', '.')
    .option('-f, --format <format>', 'Output format (dot, json, tree, ai)', 'tree')
    .option('-o, --output <path>', 'Output file or directory path')
    .option('-r, --route <path>', 'Analyze specific Next.js route')
    .option('--leaves', 'Show only leaf nodes')
    .option('--orphans', 'Show only orphan nodes')
    .option('--cycles', 'Highlight cycles in output')
    .option('--max-depth <number>', 'Maximum depth to analyze')
    .option('--external', 'Follow external dependencies')
    .option('--no-ai-json', 'Do not generate ai-docs/deps.ai.json side output')
    .option('--verbose', 'Verbose output')
    .action(async (path: string | undefined, options: unknown) => {
      await analyzeDependencies(path || '.', toAnalyzeOptions(options))
    })

  return command
}

async function analyzeDependencies(projectPath: string, options: AnalyzeCliOptions): Promise<void> {
  const analysisPath = resolvePath(projectPath)

  if (!existsSync(analysisPath)) {
    console.error(`Error: Path "${analysisPath}" does not exist.`)
    exit(1)
  }

  const selectedPath = await resolveWorkspaceProjectPath({
    targetPath: analysisPath,
    selectMessage: 'Select app to analyze',
    isCandidate: isAnalyzeCandidate,
  })
  const projectRoot = inferProjectRoot(selectedPath)
  const scanRoot = resolveScanRoot(selectedPath, projectRoot)

  const startTime = Date.now()

  if (options.verbose) {
    console.log(`Analyzing: ${selectedPath}`)
    console.log(`Project root: ${projectRoot}`)
  }

  try {
    const workspaceInfo = await resolveWorkspaceInfo(projectRoot)

    const parser = createParser({
      basePath: projectRoot,
      includeTypeImports: false,
      followExternal: options.external ?? false,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      workspacePackages: workspaceInfo.packageMap,
    })

    const graphBuilder = createGraphBuilder()

    const appDir = resolvePath(scanRoot, 'app')
    const isNextJsProject = existsSync(appDir)

    let entryPoints: string[] = []

    if (isNextJsProject) {
      const routeScanner = createRouteScanner(scanRoot)
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
        const mainPath = resolvePath(projectRoot, mainFile)
        if (existsSync(mainPath)) {
          entryPoints.push(mainPath)
          break
        }
      }

      if (entryPoints.length === 0 && existsSync(resolvePath(projectRoot, 'src'))) {
        const srcPath = resolvePath(projectRoot, 'src')
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
      const nodeType = getNodeTypeForFile(entryPoint, appDir)
      graphBuilder.addNode(entryPoint, 'es6', nodeType)
      graphBuilder.markAsEntryPoint(entryPoint)

      if (options.verbose) {
        console.log(`Processing entry point: ${entryPoint}`)
      }

      await processFile(entryPoint, parser, graphBuilder, options, appDir)
    }

    const graph = graphBuilder.getGraph()

    let routes = new Map()
    if (isNextJsProject) {
      const routeScanner = createRouteScanner(scanRoot)
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
      const output = formatOutput(analysisResult, options, {
        appRoot: projectRoot,
        appDir,
        workspaceRoot: workspaceInfo.workspaceRoot,
        packageMap: workspaceInfo.packageMap,
      })

      const outputPath =
        options.output || (options.format === 'ai' ? resolvePath(projectRoot, 'ai-docs', 'deps.ai.json') : undefined)

      if (outputPath) {
        await mkdir(dirname(outputPath), { recursive: true })
        await writeFile(outputPath, output, 'utf-8')
        console.log(`Output written to: ${outputPath}`)
      } else {
        console.log(output)
      }
    }

    if (options.aiJson !== false && options.format !== 'ai') {
      const aiSideOutputPath = resolvePath(projectRoot, 'ai-docs', 'deps.ai.json')
      const aiOutput = generateAiOutput(analysisResult, {
        appRoot: projectRoot,
        appDir,
        workspaceRoot: workspaceInfo.workspaceRoot,
        workspacePackages: workspaceInfo.packageMap,
      })

      await mkdir(dirname(aiSideOutputPath), { recursive: true })
      await writeFile(aiSideOutputPath, aiOutput, 'utf-8')
      console.log(`AI JSON written to: ${aiSideOutputPath}`)
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

function inferProjectRoot(targetPath: string): string {
  if (existsSync(resolvePath(targetPath, 'package.json'))) {
    return targetPath
  }

  const normalized = targetPath.replace(/\\/g, '/')
  if (normalized.endsWith('/src')) {
    const parent = resolvePath(targetPath, '..')
    if (existsSync(resolvePath(parent, 'package.json'))) {
      return parent
    }
  }

  return targetPath
}

function resolveScanRoot(targetPath: string, projectRoot: string): string {
  if (existsSync(resolvePath(targetPath, 'app'))) {
    return targetPath
  }

  if (existsSync(resolvePath(targetPath, 'src', 'app'))) {
    return resolvePath(targetPath, 'src')
  }

  if (existsSync(resolvePath(projectRoot, 'app'))) {
    return projectRoot
  }

  if (existsSync(resolvePath(projectRoot, 'src', 'app'))) {
    return resolvePath(projectRoot, 'src')
  }

  return targetPath
}

async function processFile(
  filePath: string,
  parser: Parser,
  graphBuilder: GraphBuilder,
  options: CliOptions,
  appDir: string,
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
    const resolved = await parser.resolveModule(dep.module, filePath)

    if (resolved) {
      if (!graphBuilder.getNode(resolved)) {
        const nodeType = getNodeTypeForFile(resolved, appDir)
        graphBuilder.addNode(resolved, dep.moduleSystem, nodeType, dep.dynamic)
      }

      graphBuilder.addEdge(filePath, resolved)

      await processFile(resolved, parser, graphBuilder, options, appDir, depth + 1, new Set(visited))
    } else if (options.external && parser.isExternalModule(dep.module)) {
      if (!graphBuilder.getNode(dep.module)) {
        graphBuilder.addNode(dep.module, dep.moduleSystem, 'external', dep.dynamic)
      }
      graphBuilder.addEdge(filePath, dep.module)
    }
  }
}

function formatOutput(
  analysisResult: AnalysisResult,
  options: CliOptions,
  context: {
    appRoot: string
    appDir: string
    workspaceRoot?: string
    packageMap: Map<string, string>
  }
): string {
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

    case 'ai':
      return generateAiOutput(analysisResult, {
        appRoot: context.appRoot,
        appDir: context.appDir,
        workspaceRoot: context.workspaceRoot,
        workspacePackages: context.packageMap,
      })
    default:
      return generateTreeOutput(analysisResult, {
        maxDepth: options.maxDepth,
        showPaths: options.verbose,
        showDynamicImports: true,
      })
  }
}

function getNodeTypeForFile(filePath: string, appDir: string) {
  const fileName = filePath.split('/').pop() || ''

  if (filePath.startsWith(appDir)) {
    if (fileName.startsWith('page.')) return 'page'
    if (fileName.startsWith('layout.')) return 'layout'
    if (fileName.startsWith('route.')) return 'route'
  }

  return 'component'
}

function toAnalyzeOptions(options: unknown): AnalyzeCliOptions {
  return options as AnalyzeCliOptions
}

function isAnalyzeCandidate(path: string): boolean {
  if (!existsSync(resolvePath(path, 'package.json'))) {
    return false
  }

  if (existsSync(resolvePath(path, 'app'))) {
    return true
  }

  if (existsSync(resolvePath(path, 'src', 'app'))) {
    return true
  }

  const mainFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'main.ts', 'main.tsx', 'main.js', 'main.jsx']
  for (const file of mainFiles) {
    if (existsSync(resolvePath(path, file)) || existsSync(resolvePath(path, 'src', file))) {
      return true
    }
  }

  return false
}

async function resolveWorkspaceInfo(appRoot: string): Promise<{
  workspaceRoot?: string
  packageMap: Map<string, string>
}> {
  const packageMap = new Map<string, string>()
  const cwd = process.cwd()
  try {
    process.chdir(appRoot)
    const workspace = await getWorkspaceDirs()
    for (const pkgDir of workspace.packages) {
      const pkgJsonPath = resolvePath(pkgDir, 'package.json')
      if (!existsSync(pkgJsonPath)) continue
      try {
        const content = await readFile(pkgJsonPath, 'utf-8')
        const pkg = JSON.parse(content) as { name?: string }
        if (pkg.name) {
          packageMap.set(pkg.name, pkgDir)
        }
      } catch {}
    }
    return { workspaceRoot: workspace.root, packageMap }
  } catch {
    return { packageMap }
  } finally {
    process.chdir(cwd)
  }
}
