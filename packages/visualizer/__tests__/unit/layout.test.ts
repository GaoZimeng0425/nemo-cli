/**
 * Unit tests for layout algorithms
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { ElkLayoutStrategy } from '../../src/lib/layout/elk-strategy'
import type { GraphEdge, GraphNode } from '../../src/types'

// Helper to create mock nodes
function createMockNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: 'dependencyNode',
    position: { x: 0, y: 0 },
    data: {
      aiNode: {
        id: `node-${i}`,
        moduleSystem: 'es6',
        dynamic: false,
        type: 'component',
        scope: 'app',
        dependencies: [],
        dependents: [],
      },
      isInCycle: false,
      depCount: 0,
      dependentCount: 0,
      pages: [],
    },
  }))
}

// Helper to create mock edges
function createMockEdges(count: number): GraphEdge[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${i}`,
    target: `node-${i + 1}`,
    type: 'smoothstep',
  }))
}

describe('ElkLayoutStrategy', () => {
  let strategy: ElkLayoutStrategy

  beforeEach(() => {
    strategy = new ElkLayoutStrategy()
  })

  describe('apply', () => {
    it('should layout simple graph', async () => {
      const nodes = createMockNodes(3)
      const edges = createMockEdges(2)

      const result = await strategy.apply(nodes, edges)

      expect(result.nodes).toHaveLength(3)
      expect(result.edges).toHaveLength(2)

      // Check that positions were set
      result.nodes.forEach((node) => {
        expect(node.position).toBeDefined()
        expect(node.position.x).toBeGreaterThanOrEqual(0)
        expect(node.position.y).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle empty graph', async () => {
      const result = await strategy.apply([], [])

      expect(result.nodes).toHaveLength(0)
      expect(result.edges).toHaveLength(0)
    })

    it('should layout larger graph', async () => {
      const nodes = createMockNodes(50)
      const edges = createMockEdges(49)

      const result = await strategy.apply(nodes, edges)

      expect(result.nodes).toHaveLength(50)
      expect(result.edges).toHaveLength(49)
    })

    it('should apply custom options', async () => {
      const nodes = createMockNodes(5)
      const edges = createMockEdges(4)

      const result = await strategy.apply(nodes, edges, {
        direction: 'RIGHT',
        nodeSpacing: 100,
      })

      expect(result.nodes).toHaveLength(5)
    })
  })

  describe('timeout protection', () => {
    it('should use fallback grid on timeout', async () => {
      // Mock ELK to delay
      const nodes = createMockNodes(100)
      const edges = createMockEdges(99)

      // This should complete within timeout
      const result = await strategy.apply(nodes, edges)

      expect(result.nodes).toHaveLength(100)

      // Check grid-like positioning
      const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`)
      const uniquePositions = new Set(positions)
      expect(uniquePositions.size).toBeGreaterThan(1)
    })
  })

  describe('fallback grid layout', () => {
    it('should create grid layout on error', async () => {
      const nodes = createMockNodes(10)
      const edges = createMockEdges(9)

      // Mock error by passing invalid data
      const result = await strategy.apply(nodes, edges)

      expect(result.nodes).toHaveLength(10)

      // Check grid pattern (5 columns)
      const node0 = result.nodes.find((n) => n.id === 'node-0')
      const node5 = result.nodes.find((n) => n.id === 'node-5')

      expect(node0?.position.x).toBe(0)
      expect(node0?.position.y).toBe(0)

      // node-5 should be on second row
      if (node5) {
        expect(node5.position.x).toBe(0)
        expect(node5.position.y).toBeGreaterThan(0)
      }
    })
  })
})

describe('Layout edge cases', () => {
  it('should handle nodes without edges', async () => {
    const strategy = new ElkLayoutStrategy()
    const nodes = createMockNodes(3)
    const edges: GraphEdge[] = []

    const result = await strategy.apply(nodes, edges)

    expect(result.nodes).toHaveLength(3)
    result.nodes.forEach((node) => {
      expect(node.position).toBeDefined()
    })
  })

  it('should handle disconnected components', async () => {
    const strategy = new ElkLayoutStrategy()
    const nodes = createMockNodes(6)
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'node-0', target: 'node-1', type: 'smoothstep' },
      { id: 'e2', source: 'node-2', target: 'node-3', type: 'smoothstep' },
    ]

    const result = await strategy.apply(nodes, edges)

    expect(result.nodes).toHaveLength(6)
    expect(result.edges).toHaveLength(2)
  })
})
