/**
 * AI Analysis loader - Fetches analysis results from nd ai command
 */

import type { ComponentAnalysis } from '../types'

const ANALYSIS_CACHE = new Map<string, ComponentAnalysis>()

/**
 * Convert node ID to possible file paths
 */
function getPossiblePaths(nodeId: string, basePath = '/ai-docs/components'): string[] {
  const paths: string[] = []

  // Handle app: prefix -> external/app_src/
  if (nodeId.startsWith('app:')) {
    const rest = nodeId.slice(4) // Remove 'app:'

    // Try external/app_src/ prefix WITHOUT sanitizing (keep parentheses, etc.)
    const appSrcPath = rest.replace(/^src\//, 'app_src/')
    paths.push(`${basePath}/external/${appSrcPath}.json`)

    // Also try without src/ (no sanitize)
    if (rest.startsWith('src/')) {
      const withoutSrc = rest.slice(4)
      paths.push(`${basePath}/external/${withoutSrc}.json`)
    }

    // Try sanitized version as fallback
    const sanitized = sanitizePath(nodeId)
    paths.push(`${basePath}/${sanitized}.json`)
  } else if (nodeId.startsWith('ws:')) {
    // Handle workspace packages
    const rest = nodeId.slice(3) // Remove 'ws:'
    // Convert ws:pkg-name/path -> external/ws_pkgname/path
    const wsPath = rest.replace(/^([^/]+)\//, 'ws_$1/')
    paths.push(`${basePath}/external/${wsPath}.json`)

    // Try sanitized version as fallback
    const sanitized = sanitizePath(nodeId)
    paths.push(`${basePath}/${sanitized}.json`)
  } else {
    // Direct conversion for other nodes
    const sanitized = sanitizePath(nodeId)
    paths.push(`${basePath}/${sanitized}.json`)
  }

  return paths
}

function sanitizePath(value: string): string {
  return value.replace(/[:*?"<>|]/g, '_').replace(/\.\./g, '__')
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
        console.log(`[AI Analysis] Loaded for ${nodeId} from ${path}`)
        return analysis
      }
    } catch {
      // Try next path
    }
  }

  console.log(`[AI Analysis] Not found for ${nodeId}. Tried:`, possiblePaths)
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
