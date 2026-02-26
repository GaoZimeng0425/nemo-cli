/**
 * Layout strategy types and interfaces
 */

import type { GraphEdge, GraphNode, LayoutType } from '../../types'

/**
 * Layout result
 */
export interface LayoutResult {
  /** Laid out nodes with positions */
  nodes: GraphNode[]
  /** Edges (unchanged) */
  edges: GraphEdge[]
}

/**
 * Layout strategy interface
 */
export interface LayoutStrategy {
  /** Strategy name */
  name: LayoutType

  /**
   * Apply layout to graph
   *
   * @param nodes - Nodes to layout
   * @param edges - Edges between nodes
   * @param options - Optional configuration
   * @returns Promise with layout result
   */
  apply(nodes: GraphNode[], edges: GraphEdge[], options?: unknown): Promise<LayoutResult>
}

/**
 * Layout options for ELK
 */
export interface ElkLayoutOptions {
  /** Layout direction */
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'
  /** Node spacing */
  nodeSpacing?: number
  /** Layer spacing */
  layerSpacing?: number
  /** Algorithm */
  algorithm?: 'layered' | 'force' | 'mtree' | 'radial'
}
