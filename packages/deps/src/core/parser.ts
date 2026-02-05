import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type typescript from 'typescript'

import type {
  ExtractedDependency,
  ModuleSystem,
  ParserOptions,
} from './types.js'

const ACORN_OPTIONS = {
  sourceType: 'module' as const,
  ecmaVersion: 'latest' as const,
  locations: true,
  allowHashBang: true,
}

export class Parser {
  options: ParserOptions
  cache: Map<string, Promise<ExtractedDependency[]>>

  constructor(options: ParserOptions) {
    this.options = options
    this.cache = new Map()
  }

  async parseFile(filePath: string): Promise<ExtractedDependency[]> {
    const cached = this.cache.get(filePath)
    if (cached) {
      return cached
    }

    const content = await readFile(filePath, 'utf-8')

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const dependencies = await this.parseTypeScript(content, filePath)
      this.cache.set(filePath, Promise.resolve(dependencies))
      return dependencies
    }

    if (
      filePath.endsWith('.js') ||
      filePath.endsWith('.jsx') ||
      filePath.endsWith('.mjs')
    ) {
      const dependencies = await this.parseJavaScript(content)
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

    const visit = (node: ts.Node): void => {
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
      } else if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
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

  private async parseJavaScript(content: string): Promise<ExtractedDependency[]> {
    const dependencies: ExtractedDependency[] = []

    try {
      const acorn = await import('acorn')
      const acornWalk = await import('acorn-walk')
      const ast = acorn.parse(content, ACORN_OPTIONS)

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
              line: node.loc?.start.line?.line ?? 0,
              column: node.loc?.start.column ?? 0,
            })
          }
        },
        ImportExpression: (node: any) => {
          if (
            node.source?.type === 'Literal' &&
            typeof node.source.value === 'string'
          ) {
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
    } catch {
      return []
    }

    return dependencies
  }

  resolveModule(modulePath: string, fromFile: string): string | null {
    if (this.isExternalModule(modulePath)) {
      if (this.options.followExternal) {
        return modulePath
      }
      return null
    }

    return resolve(resolve(fromFile, '..'), modulePath)
  }

  isExternalModule(modulePath: string): boolean {
    return modulePath.startsWith('.') || modulePath.startsWith('/')
      ? false
      : !modulePath.includes('/')
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export function createParser(options: ParserOptions): Parser {
  return new Parser(options)
}
