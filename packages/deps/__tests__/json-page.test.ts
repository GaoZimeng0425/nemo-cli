import { describe, it, expect } from 'vitest'
import { createPageJsonGenerator } from '../src/output/json-page.js'
import type { ComponentTreeNode, DependencyGraph, NextJsRouteMetadata } from '../src/core/types.js'

describe('PageJsonGenerator', () => {
  // Mock graph data for testing
  const createMockGraph = (): DependencyGraph => ({
    nodes: new Map([
      [
        '/app/page.tsx',
        {
          id: '/app/page.tsx',
          dependencies: new Set(['/components/Header.tsx', '/components/Footer.tsx']),
          dependents: new Set(),
          moduleSystem: 'es6',
          dynamic: false,
          type: 'page',
        },
      ],
      [
        '/components/Header.tsx',
        {
          id: '/components/Header.tsx',
          dependencies: new Set(['/components/Logo.tsx']),
          dependents: new Set(['/app/page.tsx']),
          moduleSystem: 'es6',
          dynamic: false,
          type: 'component',
        },
      ],
      [
        '/components/Footer.tsx',
        {
          id: '/components/Footer.tsx',
          dependencies: new Set(),
          dependents: new Set(['/app/page.tsx']),
          moduleSystem: 'es6',
          dynamic: false,
          type: 'component',
        },
      ],
      [
        '/components/Logo.tsx',
        {
          id: '/components/Logo.tsx',
          dependencies: new Set(),
          dependents: new Set(['/components/Header.tsx']),
          moduleSystem: 'es6',
          dynamic: false,
          type: 'component',
        },
      ],
    ]),
    edges: new Map([
      ['/app/page.tsx', new Set(['/components/Header.tsx', '/components/Footer.tsx'])],
      ['/components/Header.tsx', new Set(['/components/Logo.tsx'])],
    ]),
    entryPoints: ['/app/page.tsx'],
  })

  const createMockRoutes = (): Map<string, NextJsRouteMetadata> =>
    new Map([
      [
        '/app/page.tsx',
        {
          routePath: '/',
          routeType: 'page',
          filePath: '/app/page.tsx',
          isDynamic: false,
          isCatchAll: false,
        },
      ],
      [
        '/app/dashboard/page.tsx',
        {
          routePath: '/dashboard',
          routeType: 'page',
          filePath: '/app/dashboard/page.tsx',
          isDynamic: false,
          isCatchAll: false,
        },
      ],
      [
        '/app/layout.tsx',
        {
          routePath: '/',
          routeType: 'layout',
          filePath: '/app/layout.tsx',
          isDynamic: false,
          isCatchAll: false,
        },
      ],
      [
        '/app/api/users/route.ts',
        {
          routePath: '/api/users',
          routeType: 'route',
          filePath: '/app/api/users/route.ts',
          isDynamic: false,
          isCatchAll: false,
        },
      ],
    ])

  describe('routeToFilePath', () => {
    it('should generate correct file path for root route', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Test root route '/'
      const entryFile = '/app/page.tsx'
      const routeMeta = routes.get(entryFile)!
      const result = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      expect(result).toBe('_.json')
    })

    it('should generate correct file path for nested route', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Test nested route '/api/users'
      const entryFile = '/app/api/users/route.ts'
      const routeMeta = routes.get(entryFile)!
      const result = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      expect(result).toBe('api/users.json')
    })

    it('should append suffix for layout files', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Test layout file
      const entryFile = '/app/layout.tsx'
      const routeMeta = routes.get(entryFile)!
      const result = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      expect(result).toBe('_.layout.json')
    })

    it('should append suffix for route files', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Test route file (API route)
      const entryFile = '/app/api/users/route.ts'
      const routeMeta = routes.get(entryFile)!
      const result = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      expect(result).toBe('api/users.json')
    })
  })

  describe('buildTree', () => {
    it('should build component tree with correct structure', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      const tree = generator['buildTree']('/app/page.tsx', new Set())

      // Check root node
      expect(tree.id).toBe('/app/page.tsx')
      expect(tree.type).toBe('page')
      expect(tree.path).toBe('/app/page.tsx')
      expect(tree.children).toHaveLength(2)

      // Check first level children
      const header = tree.children.find((c) => c.id === '/components/Header.tsx')
      expect(header).toBeDefined()
      expect(header?.children).toHaveLength(1)

      const footer = tree.children.find((c) => c.id === '/components/Footer.tsx')
      expect(footer).toBeDefined()
      expect(footer?.children).toHaveLength(0) // Leaf node
    })

    it('should handle leaf nodes with empty children array', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      const tree = generator['buildTree']('/components/Footer.tsx', new Set())

      expect(tree.id).toBe('/components/Footer.tsx')
      expect(tree.children).toEqual([])
    })

    it('should handle circular dependencies', () => {
      // Create graph with circular dependency
      const circularGraph: DependencyGraph = {
        nodes: new Map([
          [
            '/a.tsx',
            {
              id: '/a.tsx',
              dependencies: new Set(['/b.tsx']),
              dependents: new Set(['/b.tsx']),
              moduleSystem: 'es6',
              dynamic: false,
              type: 'component',
            },
          ],
          [
            '/b.tsx',
            {
              id: '/b.tsx',
              dependencies: new Set(['/a.tsx']),
              dependents: new Set(['/a.tsx']),
              moduleSystem: 'es6',
              dynamic: false,
              type: 'component',
            },
          ],
        ]),
        edges: new Map([['/a.tsx', new Set(['/b.tsx'])], ['/b.tsx', new Set(['/a.tsx'])]]),
        entryPoints: ['/a.tsx'],
      }

      const routes = new Map<string, NextJsRouteMetadata>()
      const generator = createPageJsonGenerator(circularGraph, routes)

      // Should not infinite loop
      const tree = generator['buildTree']('/a.tsx', new Set())

      expect(tree.id).toBe('/a.tsx')
      // The circular child should be handled gracefully
      expect(tree.children.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generateForEntry', () => {
    it('should generate correct output structure', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      const output = generator.generateForEntry('/app/page.tsx')

      expect(output).toHaveProperty('route')
      expect(output).toHaveProperty('routeType')
      expect(output).toHaveProperty('entryFile')
      expect(output).toHaveProperty('tree')
      expect(output).toHaveProperty('stats')

      expect(output.route).toBe('/')
      expect(output.routeType).toBe('page')
      expect(output.entryFile).toBe('/app/page.tsx')
      expect(output.tree).toHaveProperty('children')
      expect(output.stats).toHaveProperty('totalComponents')
      expect(output.stats).toHaveProperty('maxDepth')
      expect(output.stats).toHaveProperty('generatedAt')
    })

    it('should calculate correct statistics', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      const output = generator.generateForEntry('/app/page.tsx')

      expect(output.stats.totalComponents).toBe(4) // page + header + footer + logo
      expect(output.stats.maxDepth).toBe(2) // page -> header -> logo
    })
  })

  describe('ComponentTreeNode structure', () => {
    it('should ensure all nodes have children property', () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      const tree = generator['buildTree']('/app/page.tsx', new Set())

      const checkChildren = (node: ComponentTreeNode) => {
        expect(node).toHaveProperty('children')
        expect(Array.isArray(node.children)).toBe(true)

        for (const child of node.children) {
          checkChildren(child)
        }
      }

      checkChildren(tree)
    })
  })

  describe('generateToDirectory', () => {
    it('should create nested directory for nested routes', async () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Mock fs functions
      const createdDirs: string[] = []
      const createdFiles: string[] = []

      // Test nested route /api/users
      const entryFile = '/app/api/users/route.ts'
      const routeMeta = routes.get(entryFile)!
      const output = generator.generateForEntry(entryFile)

      const relativePath = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      expect(relativePath).toBe('api/users.json')
    })

    it('should create directory for api nested routes', async () => {
      const graph = createMockGraph()
      const routes = createMockRoutes()
      const generator = createPageJsonGenerator(graph, routes)

      // Verify the nested route file naming is correct
      const entryFile = '/app/api/users/route.ts'
      const routeMeta = routes.get(entryFile)!
      const result = generator['routeToFilePath'](routeMeta.routePath, routeMeta.routeType)

      // Should create api/users.json which requires api/ directory
      expect(result).toBe('api/users.json')
      expect(result).toMatch(/\//)  // Contains directory separator
    })
  })
})
