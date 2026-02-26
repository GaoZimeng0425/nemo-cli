/**
 * AI Analysis loader - Fetches analysis results from nd ai command
 */

import type { ComponentAnalysis } from '../types'

const ANALYSIS_CACHE = new Map<string, ComponentAnalysis>()

/**
 * Convert node ID to possible file paths
 * Matches the logic in packages/deps/src/ai/runner.ts#getComponentOutputPath
 */
function getPossiblePaths(nodeId: string, basePath = '/ai-docs/components'): string[] {
  const paths: string[] = []

  // Sanitize the node ID to match how nd ai generates files
  const sanitized = sanitizePath(nodeId)

  console.log(`[AI Analysis] Node ID: ${nodeId}`)
  console.log(`[AI Analysis] Sanitized: ${sanitized}`)
  console.log(`[AI Analysis] Base path: ${basePath}`)

  // For non-absolute paths (app:, ws:, etc.), nd ai saves to external/
  if (!nodeId.startsWith('/') && !nodeId.startsWith('.')) {
    // Try external/ prefix (this is where nd ai saves non-absolute paths)
    paths.push(`${basePath}/external/${sanitized}.json`)
  }

  // Fallback: try in the base components directory
  paths.push(`${basePath}/${sanitized}.json`)

  console.log('[AI Analysis] Trying paths:', paths)
  return paths
}

function sanitizePath(value: string): string {
  // Must match the sanitizePath in packages/deps/src/ai/runner.ts
  return value.replace(/[:*?"<>|]/g, '_').replace(/\.\../g, '__')
}

/**
 * Load AI analysis for a specific node
 */
export async function loadNodeAnalysis(
  nodeId: string,
  basePath = '/ai-docs/components'
): Promise<ComponentAnalysis | null> {
  // Check cache first
  if (ANALYSIS_CACHE.has(nodeId)) {
    return ANALYSIS_CACHE.get(nodeId)!
  }

  // Try all possible paths
  const possiblePaths = getPossiblePaths(nodeId, basePath)

  for (const path of possiblePaths) {
    try {
      const response = await fetch(path)

      if (response.ok) {
        const analysis: ComponentAnalysis = await response.json()
        ANALYSIS_CACHE.set(nodeId, analysis)
        console.log(`[AI Analysis] ✓ Loaded for ${nodeId}`)
        console.log(`              from: ${path}`)
        return analysis
      }
      console.log(`[AI Analysis] ✗ Failed (${response.status}): ${path}`)
    } catch (error) {
      console.log('[AI Analysis] ✗ Network error:', (error as Error).message)
    }
  }

  console.log(`[AI Analysis] ❌ Not found for ${nodeId}. Tried:`, possiblePaths)
  return null
}

/**
 * Load AI analyses for multiple nodes
 */
export async function loadNodeAnalyses(
  nodeIds: string[],
  basePath = '/ai-docs/components'
): Promise<Map<string, ComponentAnalysis>> {
  const results = new Map<string, ComponentAnalysis>()

  // Use Promise.allSettled to load all in parallel
  const settled = await Promise.allSettled(nodeIds.map((id) => loadNodeAnalysis(id, basePath)))

  for (const [index, nodeId] of nodeIds.entries()) {
    const result = settled[index]

    if (result && result.status === 'fulfilled' && result.value) {
      results.set(nodeId, result.value)
    }
  }

  console.log(`[AI Analysis] Loaded ${results.size}/${nodeIds.length} analyses`)
  return results
}

/**
 * Clear the analysis cache
 */
export function clearAnalysisCache(): void {
  ANALYSIS_CACHE.clear()
}
