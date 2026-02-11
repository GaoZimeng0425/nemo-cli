import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type typescript from 'typescript'

import type { ExtractedDependency, ParserOptions } from './types'

export class Parser {
  options: ParserOptions
  cache: Map<string, Promise<ExtractedDependency[]>>
  pathMappings: Map<string, string[]> = new Map()
  baseUrl = ''
  workspacePackages: Map<string, string>
  private tsConfigPromise: Promise<void>
  private compilerOptions?: typescript.CompilerOptions
  private moduleResolutionCache?: typescript.ModuleResolutionCache
  private ts?: typeof typescript
  private tsPromise?: Promise<typeof typescript>

  constructor(options: ParserOptions) {
    this.options = options
    this.cache = new Map()
    this.workspacePackages = options.workspacePackages ?? new Map()
    this.tsConfigPromise = this.loadTsConfig()
  }

  private async loadTsConfig(): Promise<void> {
    try {
      const ts = await this.getTypeScript()
      const tsConfigPath =
        ts.findConfigFile(this.options.basePath, ts.sys.fileExists, 'tsconfig.json') ??
        ts.findConfigFile(this.options.basePath, ts.sys.fileExists, 'jsconfig.json')

      if (!tsConfigPath) {
        this.baseUrl = this.options.basePath
        return
      }

      const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
      if (configFile.error) {
        this.baseUrl = this.options.basePath
        return
      }

      const configDir = dirname(tsConfigPath)
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir, undefined, tsConfigPath)

      this.compilerOptions = parsed.options
      this.baseUrl = this.compilerOptions.baseUrl ? resolve(configDir, this.compilerOptions.baseUrl) : configDir
      this.moduleResolutionCache = ts.createModuleResolutionCache(configDir, (value) => value, this.compilerOptions)

      if (this.compilerOptions.paths) {
        for (const [pattern, targets] of Object.entries(this.compilerOptions.paths)) {
          this.pathMappings.set(pattern, targets as string[])
        }
      }
    } catch (error) {
      // If tsconfig.json doesn't exist or can't be parsed, use defaults
      this.baseUrl = this.options.basePath
    }
  }

  async parseFile(filePath: string): Promise<ExtractedDependency[]> {
    await this.tsConfigPromise
    const cached = this.cache.get(filePath)
    if (cached) {
      return cached
    }

    const content = await readFile(filePath, 'utf-8')

    // Use TypeScript parser for .ts, .tsx, and .js files (since .js files in Next.js may contain JSX)
    if (
      filePath.endsWith('.ts') ||
      filePath.endsWith('.tsx') ||
      filePath.endsWith('.js') ||
      filePath.endsWith('.jsx') ||
      filePath.endsWith('.mjs') ||
      filePath.endsWith('.cjs')
    ) {
      const dependencies = await this.parseTypeScript(content, filePath)
      this.cache.set(filePath, Promise.resolve(dependencies))
      return dependencies
    }

    this.cache.set(filePath, Promise.resolve([]))
    return []
  }

  private async parseTypeScript(content: string, filePath: string): Promise<ExtractedDependency[]> {
    const dependencies: ExtractedDependency[] = []
    const ts = await this.getTypeScript()
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)

    const visit = (node: typescript.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          dependencies.push({
            module: moduleSpecifier.text,
            moduleSystem: 'es6' as const,
            dynamic: false,
            type: 'import',
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
          })
        }
      } else if (ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          dependencies.push({
            module: moduleSpecifier.text,
            moduleSystem: 'es6' as const,
            dynamic: false,
            type: 're-export',
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
          })
        }
      } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        const arg = node.arguments[0]
        if (arg && ts.isStringLiteral(arg)) {
          dependencies.push({
            module: arg.text,
            moduleSystem: 'commonjs' as const,
            dynamic: false,
            type: 'require',
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
          })
        }
      } else if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'import' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        dependencies.push({
          module: node.arguments[0].text,
          moduleSystem: 'es6' as const,
          dynamic: true,
          type: 'dynamic-import',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
        })
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return dependencies
  }

  async resolveModule(modulePath: string, fromFile: string): Promise<string | null> {
    await this.tsConfigPromise

    const workspaceResolved = this.resolveWorkspaceModule(modulePath)
    if (workspaceResolved) {
      return workspaceResolved
    }

    const tsResolved = await this.resolveWithTypeScript(modulePath, fromFile)
    if (tsResolved) {
      if (this.isNodeModulesPath(tsResolved)) {
        return this.options.followExternal ? tsResolved : null
      }
      return tsResolved
    }

    // Check if this is a path alias that needs to be resolved
    const aliasedPath = this.resolvePathAlias(modulePath)
    if (aliasedPath) {
      return this.resolveFileWithExtensions(aliasedPath)
    }

    if (this.isExternalModule(modulePath)) {
      return null
    }

    const resolvedPath = this.resolveFileWithExtensions(resolve(resolve(fromFile, '..'), modulePath))

    return resolvedPath
  }

  private async resolveWithTypeScript(modulePath: string, fromFile: string): Promise<string | null> {
    if (!this.compilerOptions) {
      return null
    }

    const ts = await this.getTypeScript()
    const result = ts.resolveModuleName(modulePath, fromFile, this.compilerOptions, ts.sys, this.moduleResolutionCache)

    const resolved = result.resolvedModule?.resolvedFileName
    if (!resolved) {
      return null
    }

    return resolved
  }

  private resolveWorkspaceModule(modulePath: string): string | null {
    const workspacePackage = this.matchWorkspacePackage(modulePath)
    if (!workspacePackage) {
      return null
    }

    const packageRoot = this.workspacePackages.get(workspacePackage)
    if (!packageRoot) {
      return null
    }

    if (modulePath === workspacePackage) {
      return this.resolveFileWithExtensions(resolve(packageRoot, 'index'))
    }

    const subpath = modulePath.slice(workspacePackage.length + 1)
    return this.resolveFileWithExtensions(resolve(packageRoot, subpath))
  }

  private matchWorkspacePackage(modulePath: string): string | null {
    for (const name of this.workspacePackages.keys()) {
      if (modulePath === name || modulePath.startsWith(`${name}/`)) {
        return name
      }
    }
    return null
  }

  private resolvePathAlias(modulePath: string): string | null {
    // Check if modulePath matches any path alias pattern
    for (const [pattern, targets] of this.pathMappings.entries()) {
      // Convert pattern to regex
      const patternRegex = new RegExp(`^${pattern.replace('*', '(.*)')}$`)
      const match = modulePath.match(patternRegex)

      if (match && match[1] !== undefined) {
        // Extract the wildcard part
        const wildcard = match[1]
        // Use the first target from tsconfig
        const target = targets[0]
        // Replace the wildcard in the target
        const resolvedTarget = target?.replace('*', wildcard) ?? ''
        // Resolve relative to baseUrl
        return resolve(this.baseUrl, resolvedTarget)
      }

      // Also check for exact match (no wildcard)
      if (modulePath === pattern) {
        const target = targets[0]
        return resolve(this.baseUrl, target ?? '')
      }
    }

    return null
  }

  private resolveFileWithExtensions(filePath: string): string | null {
    // Check if it's a directory
    if (existsSync(filePath)) {
      try {
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
          // Try index files in the directory
          for (const ext of this.options.extensions) {
            const indexPath = resolve(filePath, `index${ext}`)
            if (existsSync(indexPath)) {
              return indexPath
            }
          }
          // If no index file found, return null
          return null
        }
        // It's a file, return it
        return filePath
      } catch {
        // If stat fails, continue to try extensions
      }
    }

    // Try adding supported extensions
    for (const ext of this.options.extensions) {
      const pathWithExt = filePath + ext
      if (existsSync(pathWithExt)) {
        return pathWithExt
      }
    }

    return null
  }

  isExternalModule(modulePath: string): boolean {
    // Local paths start with . or /
    if (modulePath.startsWith('.') || modulePath.startsWith('/')) {
      return false
    }

    // Check if it's a path alias (e.g., @/, @/utils)
    // Path aliases with a single segment after @ are usually local aliases
    if (modulePath.startsWith('@/')) {
      return false
    }

    // Check if it matches any workspace package
    if (this.matchWorkspacePackage(modulePath)) {
      return false
    }

    // Check if it matches any of our path mappings
    for (const pattern of this.pathMappings.keys()) {
      const patternRegex = new RegExp(`^${pattern.replace('*', '.*')}$`)
      if (patternRegex.test(modulePath)) {
        return false
      }
    }

    // Scoped packages like @scope/name are external modules
    if (modulePath.startsWith('@')) {
      return true
    }

    // Simple package names without / are external
    if (!modulePath.includes('/')) {
      return true
    }

    // Package subpaths like lodash/fp are external unless mapped
    return true
  }

  clearCache(): void {
    this.cache.clear()
  }

  private isNodeModulesPath(resolvedPath: string): boolean {
    return resolvedPath.includes('/node_modules/') || resolvedPath.includes('\\node_modules\\')
  }

  private async getTypeScript(): Promise<typeof typescript> {
    if (this.ts) {
      return this.ts
    }
    if (!this.tsPromise) {
      this.tsPromise = import('typescript').then((mod) => mod.default as typeof typescript)
    }
    this.ts = await this.tsPromise
    return this.ts
  }
}

export function createParser(options: ParserOptions): Parser {
  return new Parser(options)
}
