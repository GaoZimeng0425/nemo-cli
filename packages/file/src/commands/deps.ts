import fs from 'node:fs'
import { createRequire } from 'node:module'
import path, { dirname as pathDirname, resolve } from 'node:path'

import { type Command, log } from '@nemo-cli/shared'

// Use createRequire to import CommonJS module (madge) in ESM context
const require = createRequire(import.meta.url)
const madge = require('madge')

// Directories to exclude from scanning
const EXCLUDED_DIRS = [
  '.next',
  'node_modules',
  '.git',
  'dist',
  'build',
  '.turbo',
  '.vercel',
  'coverage',
  '__tests__',
  '__mocks__',
]

// File patterns for Next.js page files
const PAGE_FILE_PATTERNS = [
  /\/page\.(js|jsx|ts|tsx)$/,
  /\/route\.(js|jsx|ts|tsx)$/,
  /\/layout\.(js|jsx|ts|tsx)$/,
  /\/loading\.(js|jsx|ts|tsx)$/,
  /\/error\.(js|jsx|ts|tsx)$/,
  /\/not-found\.(js|jsx|ts|tsx)$/,
  /\/template\.(js|jsx|ts|tsx)$/,
]

// Legacy pages directory patterns
const LEGACY_PAGE_PATTERNS = [/^(?!_app|_document|_error|api\/).*\.(js|jsx|ts|tsx)$/]

/**
 * Recursively find all files in a directory, excluding certain directories
 */
function findFiles(dir: string, excludeDirs: string[]): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...findFiles(fullPath, excludeDirs))
      }
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Find all Next.js page files in the project
 */
function findNextjsPages(root: string): string[] {
  const pages: string[] = []

  // Check for App Router (app directory)
  const appDir = path.join(root, 'app')
  const srcAppDir = path.join(root, 'src', 'app')

  // Check for Pages Router (pages directory)
  const pagesDir = path.join(root, 'pages')
  const srcPagesDir = path.join(root, 'src', 'pages')

  // Find App Router pages
  for (const dir of [appDir, srcAppDir]) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir, EXCLUDED_DIRS)
      for (const file of files) {
        const relativePath = path.relative(root, file)
        if (PAGE_FILE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
          pages.push(file)
        }
      }
    }
  }

  // Find Pages Router pages
  for (const dir of [pagesDir, srcPagesDir]) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir, EXCLUDED_DIRS)
      for (const file of files) {
        const fileName = path.basename(file)
        const ext = path.extname(file)
        // Include .js, .jsx, .ts, .tsx files, exclude _app, _document, etc.
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          if (!fileName.startsWith('_') && !file.includes('/api/')) {
            pages.push(file)
          }
        }
      }
    }
  }

  return pages
}

/**
 * Filter out excluded directories from the dependency tree
 */
function filterTree(tree: Record<string, string[]>): Record<string, string[]> {
  const filtered: Record<string, string[]> = {}

  for (const [file, deps] of Object.entries(tree)) {
    // Skip files in excluded directories
    if (EXCLUDED_DIRS.some((dir) => file.includes(`/${dir}/`) || file.startsWith(`${dir}/`))) {
      continue
    }

    // Filter dependencies
    const filteredDeps = deps.filter(
      (dep) => !EXCLUDED_DIRS.some((dir) => dep.includes(`/${dir}/`) || dep.startsWith(`${dir}/`))
    )

    filtered[file] = filteredDeps
  }

  return filtered
}

export const depsCommand = (program: Command) => {
  program
    .command('deps [entry]')
    .description('Generate a dependency tree for Next.js/TypeScript projects using madge')
    .option('-o, --output <file>', 'Output JSON file path', 'deps-tree.json')
    .option('-t, --tsconfig <path>', 'Path to tsconfig.json for resolving aliases')
    .option('--webpack-config <path>', 'Path to webpack config for resolving aliases')
    .option('--include-npm', 'Include npm packages in the dependency tree', false)
    .option('--circular', 'Only output circular dependencies', false)
    .option('--pages', 'Scan Next.js pages/app directory for entry points', false)
    .option('--exclude <dirs>', 'Additional directories to exclude (comma-separated)', '')
    .alias('dt')
    .action(async (entry: string | undefined, options) => {
      const root = process.cwd()
      const outputPath = resolve(root, options.output)

      // Add custom exclusions
      const customExcludes = options.exclude ? options.exclude.split(',').map((d: string) => d.trim()) : []
      const allExcludes = [...EXCLUDED_DIRS, ...customExcludes]

      try {
        // Build madge configuration
        const madgeConfig: Record<string, unknown> = {
          baseDir: root,
          includeNpm: options.includeNpm,
          fileExtensions: ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'],
          excludeRegExp: [
            /node_modules/,
            /\.next/,
            /\.git/,
            /dist/,
            /build/,
            ...customExcludes.map((dir: string) => new RegExp(dir)),
          ],
          detectiveOptions: {
            ts: {
              skipTypeImports: true,
            },
            tsx: {
              skipTypeImports: true,
            },
          },
        }

        // Add tsconfig if provided or auto-detect
        if (options.tsconfig) {
          madgeConfig.tsConfig = resolve(root, options.tsconfig)
        } else {
          const defaultTsConfig = resolve(root, 'tsconfig.json')
          if (fs.existsSync(defaultTsConfig)) {
            madgeConfig.tsConfig = defaultTsConfig
            log.info('deps', `Using tsconfig: ${defaultTsConfig}`)
          }
        }

        // Add webpack config if provided
        if (options.webpackConfig) {
          madgeConfig.webpackConfig = resolve(root, options.webpackConfig)
        }

        let entryPoints: string[]

        if (options.pages) {
          // Scan for Next.js pages
          entryPoints = findNextjsPages(root)
          if (entryPoints.length === 0) {
            log.error('deps', 'No Next.js pages found in app/ or pages/ directory')
            return
          }
          log.info('deps', `Found ${entryPoints.length} Next.js page files`)
          for (const page of entryPoints) {
            log.show(`  - ${path.relative(root, page)}`)
          }
        } else if (entry) {
          entryPoints = [resolve(root, entry)]
        } else {
          // Default: scan current directory
          entryPoints = [resolve(root, '.')]
        }

        log.show(`Analyzing dependencies from ${entryPoints.length} entry point(s)...`)

        // Analyze all entry points
        const result = await madge(entryPoints, madgeConfig)

        let tree: Record<string, string[]>

        if (options.circular) {
          const circular = result.circular()
          tree = { circularDependencies: circular }
          log.info('deps', `Found ${circular.length} circular dependency chains`)
        } else {
          // Get and filter the tree
          tree = filterTree(result.obj())
        }

        // Write output
        const dir = pathDirname(outputPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2))

        log.success('deps', `Dependency tree generated at: ${outputPath}`)
        log.info('deps', `Total modules analyzed: ${Object.keys(tree).length}`)

        // Show summary
        const totalDeps = Object.values(tree).reduce((sum, deps) => sum + deps.length, 0)
        log.info('deps', `Total dependencies: ${totalDeps}`)
      } catch (err) {
        log.error('deps', `Failed to generate dependency tree: ${(err as Error).message}`)
        console.error(err)
      }
    })
}
