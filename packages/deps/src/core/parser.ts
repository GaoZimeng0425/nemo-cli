import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type typescript from 'typescript'

import type { ExtractedDependency, ParserOptions } from './types.js'

const ACORN_OPTIONS = {
  sourceType: 'module' as const,
  ecmaVersion: 'latest' as const,
  locations: true,
  allowHashBang: true,
}

export class Parser {
  options: ParserOptions
  cache: Map<string, Promise<ExtractedDependency[]>>
  pathMappings: Map<string, string[]> = new Map()
  baseUrl = ''

  constructor(options: ParserOptions) {
    this.options = options
    this.cache = new Map()
    this.loadTsConfig()
  }

  private async loadTsConfig(): Promise<void> {
    try {
      const tsConfigPath = resolve(this.options.basePath, 'tsconfig.json')
      const tsConfigContent = await readFile(tsConfigPath, 'utf-8')
      const tsConfig = JSON.parse(tsConfigContent)

      // Load baseUrl
      if (tsConfig.compilerOptions?.baseUrl) {
        this.baseUrl = resolve(this.options.basePath, tsConfig.compilerOptions.baseUrl)
      } else {
        this.baseUrl = this.options.basePath
      }

      // Load path mappings
      if (tsConfig.compilerOptions?.paths) {
        for (const [pattern, targets] of Object.entries(tsConfig.compilerOptions.paths)) {
          // Convert pattern to regex (e.g., "@/*" -> "@/(.*)")
          const patternRegex = pattern.replace('*', '(.*)')
          this.pathMappings.set(pattern, targets as string[])
        }
      }
    } catch (error) {
      // If tsconfig.json doesn't exist or can't be parsed, use defaults
      this.baseUrl = this.options.basePath
    }
  }

  async parseFile(filePath: string): Promise<ExtractedDependency[]> {
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
      filePath.endsWith('.jsx')
    ) {
      const dependencies = await this.parseTypeScript(content, filePath)
      this.cache.set(filePath, Promise.resolve(dependencies))
      return dependencies
    }

    if (filePath.endsWith('.mjs')) {
      const dependencies = await this.parseJavaScript(content, filePath)
      this.cache.set(filePath, Promise.resolve(dependencies))
      return dependencies
    }

    this.cache.set(filePath, Promise.resolve([]))
    return []
  }

  private async parseTypeScript(content: string, filePath: string): Promise<ExtractedDependency[]> {
    const dependencies: ExtractedDependency[] = []
    const ts = (await import('typescript')).default as typeof typescript
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

  private async parseJavaScript(content: string, filePath: string): Promise<ExtractedDependency[]> {
    const dependencies: ExtractedDependency[] = []

    try {
      const acorn = await import('acorn')
      const acornWalk = await import('acorn-walk')

      // For .jsx files and .js files with JSX, we need to extend Acorn with JSX plugin
      let parser = acorn
      const isJsxFile = filePath.endsWith('.jsx') || filePath.endsWith('.js')

      if (isJsxFile) {
        const acornJsxPlugin = await import('acorn-jsx')
        // @ts-expect-error - acorn-jsx extends the Parser
        parser = acorn.Parser.extend(acornJsxPlugin.default())
      }

      const ast = parser.parse(content, {
        sourceType: 'module' as const,
        ecmaVersion: 'latest' as const,
        locations: true,
        allowHashBang: true,
      })

      acornWalk.simple(ast, {
        ImportDeclaration: (node: any) => {
          if (node.source?.value) {
            dependencies.push({
              module: node.source.value,
              moduleSystem: 'es6' as const,
              dynamic: false,
              type: 'import',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
        ExportNamedDeclaration: (node: any) => {
          if (node.source?.value) {
            dependencies.push({
              module: node.source.value,
              moduleSystem: 'es6' as const,
              dynamic: false,
              type: 're-export',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
        ExportAllDeclaration: (node: any) => {
          if (node.source?.value) {
            dependencies.push({
              module: node.source.value,
              moduleSystem: 'es6' as const,
              dynamic: false,
              type: 're-export',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
        ImportExpression: (node: any) => {
          if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
            dependencies.push({
              module: node.source.value,
              moduleSystem: 'es6' as const,
              dynamic: true,
              type: 'dynamic-import',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
        CallExpression: (node: any) => {
          if (
            node.callee?.type === 'Identifier' &&
            node.callee?.name === 'require' &&
            node.arguments[0]?.type === 'Literal' &&
            typeof node.arguments[0].value === 'string'
          ) {
            dependencies.push({
              module: node.arguments[0].value,
              moduleSystem: 'commonjs' as const,
              dynamic: false,
              type: 'require',
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
      })
    } catch (error) {
      // Log error for debugging
      if (process.env.DEBUG) {
        console.error(`Error parsing JavaScript file ${filePath}:`, error)
      }
      return []
    }

    return dependencies
  }

  resolveModule(modulePath: string, fromFile: string): string | null {
    // Check if this is a path alias that needs to be resolved
    const aliasedPath = this.resolvePathAlias(modulePath)
    if (aliasedPath) {
      return this.resolveFileWithExtensions(aliasedPath)
    }

    if (this.isExternalModule(modulePath)) {
      if (this.options.followExternal) {
        return modulePath
      }
      return null
    }

    const resolvedPath = this.resolveFileWithExtensions(resolve(resolve(fromFile, '..'), modulePath))

    return resolvedPath
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

    // Paths with / could be either local paths or package subpaths
    // For safety, treat them as local paths to resolve
    return false
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export function createParser(options: ParserOptions): Parser {
  return new Parser(options)
}
