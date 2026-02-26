/**
 * ELK layout strategy implementation
 */

import * as ELK from 'elkjs'

import type { GraphEdge, GraphNode } from '../../types'
import type { ElkLayoutOptions, LayoutResult, LayoutStrategy } from './types'

interface ElkNode {
  id?: string
  children?: ElkNode[]
  edges?: ElkExtendedEdge[]
  x?: number
  y?: number
  width?: number
  height?: number
  _reactFlowNode?: GraphNode
}

interface ElkExtendedEdge {
  id?: string
  sources: string[]
  targets: string[]
}

// Create ELK instance
const elk = new ELK.default()

/**
 * Default ELK layout options
 */
const defaultOptions: ElkLayoutOptions = {
  direction: 'DOWN',
  nodeSpacing: 50,
  layerSpacing: 100,
  algorithm: 'layered',
}

/**
 * Transform React Flow graph to ELK graph format
 */
function transformToElkGraph(nodes: GraphNode[], edges: GraphEdge[]): ElkNode {
  const elkChildren = nodes.map((node) => ({
    id: node.id,
    width: 200, // Default node width
    height: 80, // Default node height
    // Store original node data
    _reactFlowNode: node,
  }))

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }))

  return {
    id: 'root',
    children: elkChildren,
    edges: elkEdges,
  }
}

/**
 * Transform ELK layout result back to React Flow format
 */
function transformToReactFlow(elkNode: ElkNode): GraphNode[] {
  const nodes: GraphNode[] = []

  if (elkNode.children) {
    for (const child of elkNode.children) {
      const originalNode = (child as unknown as { _reactFlowNode: GraphNode })._reactFlowNode as GraphNode

      nodes.push({
        ...originalNode,
        position: {
          x: child.x || 0,
          y: child.y || 0,
        },
      })
    }
  }

  return nodes
}

/**
 * ELK layout strategy
 */
export class ElkLayoutStrategy implements LayoutStrategy {
  name = 'elk' as const

  async apply(nodes: GraphNode[], edges: GraphEdge[], options: Partial<ElkLayoutOptions> = {}): Promise<LayoutResult> {
    const mergedOptions = { ...defaultOptions, ...options }

    // Transform to ELK format
    const elkGraph = transformToElkGraph(nodes, edges)

    // Build ELK layout options
    const elkLayoutOptions: Record<string, string> = {
      'elk.direction': mergedOptions.direction || 'DOWN',
      'elk.spacing.nodeNode': `${mergedOptions.nodeSpacing}`,
      'elk.layered.spacing.nodeNodeBetweenLayers': `${mergedOptions.layerSpacing}`,
      'elk.algorithm': mergedOptions.algorithm || 'layered',
    }

    try {
      // Apply layout with timeout
      const layoutedGraph = (await Promise.race([
        elk.layout(elkGraph as any, {
          layoutOptions: elkLayoutOptions,
        }),
        new Promise<ElkNode>((_, reject) => setTimeout(() => reject(new Error('Layout timeout after 10s')), 10000)),
      ])) as ElkNode

      // Transform back to React Flow format
      const layoutedNodes = transformToReactFlow(layoutedGraph)

      return {
        nodes: layoutedNodes,
        edges,
      }
    } catch (error) {
      // Fallback: use simple grid layout on timeout/error
      console.warn('ELK layout failed, using fallback grid layout:', error)
      return this.fallbackGridLayout(nodes, edges)
    }
  }

  /**
   * Fallback grid layout when ELK fails
   */
  private fallbackGridLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutResult {
    const GRID_SIZE = 250
    const COLS = 5

    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % COLS) * GRID_SIZE,
        y: Math.floor(index / COLS) * GRID_SIZE,
      },
    }))

    return {
      nodes: layoutedNodes,
      edges,
    }
  }
}
