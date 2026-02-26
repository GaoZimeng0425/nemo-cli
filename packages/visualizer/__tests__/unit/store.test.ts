/**
 * Unit tests for GraphStore
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { useGraphStore } from '../../src/store/useGraphStore'
import type { AiOutput } from '../../src/types'

// Mock AiOutput data
const createMockAiOutput = (): AiOutput => ({
  meta: {
    generatedAt: '2025-01-01T00:00:00.000Z',
    appRoot: '/app',
    appDir: '/app/app',
  },
  nodes: {
    'app/page.tsx': {
      id: 'app/page.tsx',
      path: '/app/app/page.tsx',
      relativePath: 'app/page.tsx',
      scope: 'app',
      moduleSystem: 'es6',
      dynamic: false,
      type: 'page',
      dependencies: ['components/Button.tsx'],
      dependents: [],
    },
    'components/Button.tsx': {
      id: 'components/Button.tsx',
      path: '/app/components/Button.tsx',
      relativePath: 'components/Button.tsx',
      scope: 'app',
      moduleSystem: 'es6',
      dynamic: false,
      type: 'component',
      dependencies: [],
      dependents: ['app/page.tsx'],
    },
    'utils/helpers.ts': {
      id: 'utils/helpers.ts',
      path: '/app/utils/helpers.ts',
      relativePath: 'utils/helpers.ts',
      scope: 'workspace',
      moduleSystem: 'es6',
      dynamic: false,
      type: 'util',
      dependencies: [],
      dependents: [],
    },
  },
  pages: {},
  nodeToPages: {},
  sccs: [],
  nodeToScc: {},
})

describe('useGraphStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGraphStore.getState().clearData()
  })

  describe('loadAiOutput', () => {
    it('should load AiOutput and build graph', () => {
      const mockData = createMockAiOutput()
      const store = useGraphStore.getState()

      store.loadAiOutput(mockData)

      expect(store.aiOutput).toEqual(mockData)
      expect(store.nodes).toHaveLength(3)
      expect(store.edges).toHaveLength(1)
    })

    it('should create nodes with correct data', () => {
      const mockData = createMockAiOutput()
      const store = useGraphStore.getState()

      store.loadAiOutput(mockData)

      const pageNode = store.nodes.find((n) => n.id === 'app/page.tsx')
      expect(pageNode).toBeDefined()
      expect(pageNode?.data.aiNode.type).toBe('page')
      expect(pageNode?.data.depCount).toBe(1)
    })

    it('should create edges correctly', () => {
      const mockData = createMockAiOutput()
      const store = useGraphStore.getState()

      store.loadAiOutput(mockData)

      const edge = store.edges.find((e) => e.source === 'app/page.tsx')
      expect(edge?.target).toBe('components/Button.tsx')
    })
  })

  describe('filterByScope', () => {
    beforeEach(() => {
      const mockData = createMockAiOutput()
      useGraphStore.getState().loadAiOutput(mockData)
    })

    it('should filter nodes by scope', () => {
      const store = useGraphStore.getState()

      store.setFilteredScopes(['app'])
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(2)
      expect(filteredNodes.every((n) => n.data.aiNode.scope === 'app')).toBe(true)
    })

    it('should show all nodes when all scopes selected', () => {
      const store = useGraphStore.getState()

      store.setFilteredScopes(['app', 'workspace', 'external', 'internal', 'other'])
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(3)
    })

    it('should toggle scope filter', () => {
      const store = useGraphStore.getState()

      store.toggleScopeFilter('app')
      expect(store.filteredScopes).not.toContain('app')

      const filteredNodes = store.getFilteredNodes()
      expect(filteredNodes).toHaveLength(1)
      expect(filteredNodes[0].id).toBe('utils/helpers.ts')
    })
  })

  describe('searchNodes', () => {
    beforeEach(() => {
      const mockData = createMockAiOutput()
      useGraphStore.getState().loadAiOutput(mockData)
    })

    it('should search nodes by id', () => {
      const store = useGraphStore.getState()

      store.searchNodes('page')
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(1)
      expect(filteredNodes[0].id).toBe('app/page.tsx')
    })

    it('should search nodes by path', () => {
      const store = useGraphStore.getState()

      store.searchNodes('components')
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(1)
      expect(filteredNodes[0].id).toBe('components/Button.tsx')
    })

    it('should be case insensitive', () => {
      const store = useGraphStore.getState()

      store.searchNodes('PAGE')
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(1)
    })

    it('should handle empty search', () => {
      const store = useGraphStore.getState()

      store.searchNodes('')
      const filteredNodes = store.getFilteredNodes()

      expect(filteredNodes).toHaveLength(3)
    })
  })

  describe('selectNode', () => {
    beforeEach(() => {
      const mockData = createMockAiOutput()
      useGraphStore.getState().loadAiOutput(mockData)
    })

    it('should select node', () => {
      const store = useGraphStore.getState()

      store.selectNode('app/page.tsx')

      expect(store.selectedNodeId).toBe('app/page.tsx')
      expect(store.getSelectedNode()?.id).toBe('app/page.tsx')
    })

    it('should deselect node', () => {
      const store = useGraphStore.getState()

      store.selectNode('app/page.tsx')
      store.selectNode(null)

      expect(store.selectedNodeId).toBeNull()
      expect(store.getSelectedNode()).toBeUndefined()
    })
  })

  describe('getNodeById', () => {
    beforeEach(() => {
      const mockData = createMockAiOutput()
      useGraphStore.getState().loadAiOutput(mockData)
    })

    it('should get node by id', () => {
      const store = useGraphStore.getState()

      const node = store.getNodeById('app/page.tsx')

      expect(node).toBeDefined()
      expect(node?.id).toBe('app/page.tsx')
    })

    it('should return undefined for non-existent node', () => {
      const store = useGraphStore.getState()

      const node = store.getNodeById('non-existent')

      expect(node).toBeUndefined()
    })
  })

  describe('clearData', () => {
    it('should clear all data', () => {
      const mockData = createMockAiOutput()
      const store = useGraphStore.getState()

      store.loadAiOutput(mockData)
      expect(store.nodes).toHaveLength(3)

      store.clearData()

      expect(store.aiOutput).toBeNull()
      expect(store.nodes).toHaveLength(0)
      expect(store.edges).toHaveLength(0)
      expect(store.selectedNodeId).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should set and clear error', () => {
      const store = useGraphStore.getState()

      store.setError('Test error')
      expect(store.error).toBe('Test error')

      store.setError(null)
      expect(store.error).toBeNull()
    })

    it('should set loading state', () => {
      const store = useGraphStore.getState()

      store.setLoading(true)
      expect(store.isLoading).toBe(true)

      store.setLoading(false)
      expect(store.isLoading).toBe(false)
    })
  })
})
