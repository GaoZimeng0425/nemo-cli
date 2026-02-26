/**
 * Layout manager - handles different layout strategies
 */

import type { GraphEdge, GraphNode } from '../types'
import { ForceLayoutStrategy, HierarchicalD3LayoutStrategy } from './layout/force-strategy'
import { GridLayoutStrategy } from './layout/grid-strategy'

export type LayoutType = 'force' | 'hierarchical' | 'grid'

/**
 * Get layout strategy
 */
export function getLayoutStrategy(type: LayoutType) {
  switch (type) {
    case 'force':
      return new ForceLayoutStrategy()
    case 'hierarchical':
      return new HierarchicalD3LayoutStrategy()
    case 'grid':
      return new GridLayoutStrategy()
    default:
      return new ForceLayoutStrategy()
  }
}

/**
 * Apply layout with fallback
 */
export async function applyLayout(nodes: GraphNode[], edges: GraphEdge[], type: LayoutType = 'force') {
  const strategy = getLayoutStrategy(type)
  return await strategy.apply(nodes, edges)
}
