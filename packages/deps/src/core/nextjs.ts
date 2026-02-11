import { readdir, stat } from 'node:fs/promises'
import { join, resolve as resolvePath } from 'node:path'

import type { NextJsRouteMetadata } from './types'

export class NextJsRouteScanner {
  private appDir: string

  constructor(projectPath: string) {
    this.appDir = resolvePath(projectPath, 'app')
  }

  async scanRoutes(): Promise<Map<string, NextJsRouteMetadata>> {
    const routes = new Map<string, NextJsRouteMetadata>()

    try {
      await this.scanDirectory(this.appDir, '', routes)
    } catch {
      return routes
    }

    return routes
  }

  private async scanDirectory(
    dirPath: string,
    routePath: string,
    routes: Map<string, NextJsRouteMetadata>
  ): Promise<void> {
    try {
      const entries = await readdir(dirPath)

      for (const entry of entries) {
        const fullPath = join(dirPath, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          if (this.isRouteGroup(entry)) {
            await this.scanDirectory(fullPath, routePath, routes)
          } else if (entry.startsWith('_')) {
          } else {
            const newRoutePath = entry.startsWith('(') ? routePath : join(routePath, entry)
            await this.scanDirectory(fullPath, newRoutePath, routes)
          }
        } else if (stats.isFile() && this.isRouteFile(entry)) {
          const routeMetadata = this.createRouteMetadata(fullPath, routePath, entry)
          routes.set(fullPath, routeMetadata)
        }
      }
    } catch {
      return
    }
  }

  private isRouteGroup(name: string): boolean {
    return name.startsWith('(') && name.endsWith(')')
  }

  private isRouteFile(name: string): boolean {
    const routeFiles = [
      'page.ts',
      'page.tsx',
      'page.js',
      'page.jsx',
      'layout.ts',
      'layout.tsx',
      'layout.js',
      'layout.jsx',
      'route.ts',
      'route.tsx',
      'route.js',
      'route.jsx',
    ]
    return routeFiles.some((file) => name === file || name.startsWith(file.split('.')[0] || ''))
  }

  private createRouteMetadata(filePath: string, routePath: string, fileName: string): NextJsRouteMetadata {
    const baseName = fileName.split('.')[0] || fileName

    let routeType: NextJsRouteMetadata['routeType'] = 'page'
    if (baseName === 'layout') {
      routeType = 'layout'
    } else if (baseName === 'route') {
      routeType = 'route'
    } else if (baseName === 'loading') {
      routeType = 'loading'
    } else if (baseName === 'error') {
      routeType = 'error'
    } else if (baseName === 'not-found') {
      routeType = 'not-found'
    }

    let finalRoutePath = `/${routePath.replace(/\[([^.]+)\.\.\.([^.]+)\]/g, '[[...$1]]')}`
    finalRoutePath = finalRoutePath.replace(/\[([^.]+)\.\.([^.]+)\]/g, '[...$1]')
    finalRoutePath = finalRoutePath.replace(/\[([^.]+)\]/g, '[$1]')
    finalRoutePath = finalRoutePath.replace(/\(([^)]+)\)/g, '')

    if (finalRoutePath === '/') {
      finalRoutePath = routePath === '' ? '/' : `/${routePath}`
    }

    const isDynamic = /\[([^.]+)\]/.test(finalRoutePath)
    const isCatchAll = /\[\.\.\.([^.]+)\]/.test(finalRoutePath)

    return {
      routePath: finalRoutePath || '/',
      routeType,
      filePath,
      isDynamic,
      isCatchAll,
    }
  }

  async getRouteFiles(): Promise<string[]> {
    const routeFiles: string[] = []
    const collectRouteFiles = async (dirPath: string, visited: Set<string> = new Set()): Promise<void> => {
      try {
        const entries = await readdir(dirPath)

        for (const entry of entries) {
          const fullPath = join(dirPath, entry)
          const stats = await stat(fullPath)

          if (stats.isDirectory()) {
            if (!entry.startsWith('_')) {
              // Include route groups - they should be traversed to find pages
              await collectRouteFiles(fullPath, new Set(visited))
            }
          } else if (stats.isFile() && entry.startsWith('page.')) {
            if (!visited.has(fullPath)) {
              routeFiles.push(fullPath)
              visited.add(fullPath)
            }
          }
        }
      } catch {
        return
      }
    }

    await collectRouteFiles(this.appDir)
    return routeFiles
  }
}

export function createRouteScanner(projectPath: string): NextJsRouteScanner {
  return new NextJsRouteScanner(projectPath)
}
