/**
 * Tree Node Component - Single node in the dependency tree view
 */

import { memo } from 'react'

import { useGraphStore } from '../store/useGraphStore'
import type { GraphNode } from '../types'

// Enhanced color palette matching cyberpunk theme
const SCOPE_COLORS = {
  app: { primary: '#00F0FF', bg: 'rgba(0, 240, 255, 0.1)' },
  workspace: { primary: '#00FF94', bg: 'rgba(0, 255, 148, 0.1)' },
  external: { primary: '#FF006E', bg: 'rgba(255, 0, 110, 0.1)' },
  internal: { primary: '#FFBE0B', bg: 'rgba(255, 190, 11, 0.1)' },
  other: { primary: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
}

// Node type icons
const NODE_TYPE_ICONS = {
  page: '📄',
  layout: '🎨',
  route: '🔀',
  component: '⚡',
  util: '🔧',
  external: '📦',
  unknown: '❓',
}

interface TreeNodeProps {
  node: GraphNode
  level: number
  isExpanded: boolean
  canExpand: boolean
  hasChildren: boolean
}

export const TreeNode = memo(({ node, level, isExpanded, canExpand, hasChildren }: TreeNodeProps) => {
  const { selectNode, toggleTreeNode } = useGraphStore()
  const colors = SCOPE_COLORS[node.data.aiNode.scope] || SCOPE_COLORS.other
  const nodeTypeIcon = NODE_TYPE_ICONS[node.data.aiNode.type] || NODE_TYPE_ICONS.unknown

  // Extract filename for display
  const filename = node.data.aiNode.id.split('/').pop() || node.data.aiNode.id
  const displayName = filename.length > 30 ? `${filename.slice(0, 27)}...` : filename

  const handleClick = () => {
    selectNode(node.id)
  }

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canExpand) {
      toggleTreeNode(node.id)
    }
  }

  const handleDoubleClick = () => {
    if (canExpand) {
      toggleTreeNode(node.id)
    }
  }

  return (
    <div className="tree-node">
      {/* Node row */}
      <div
        className="group relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 transition-all duration-200 hover:border-white/10 hover:bg-white/10"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          marginLeft: `${level * 24}px`,
          minHeight: '48px',
        }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-all duration-200 hover:scale-110"
            onClick={handleExpand}
            style={{
              background: isExpanded ? colors.bg : 'transparent',
              color: colors.primary,
            }}
            type="button"
          >
            <svg
              className="h-3 w-3 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
              viewBox="0 0 24 24"
            >
              <title>Expand</title>
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
            </svg>
          </button>
        ) : (
          <div className="h-5 w-5 flex-shrink-0" />
        )}

        {/* Type icon */}
        <span className="flex-shrink-0 text-base">{nodeTypeIcon}</span>

        {/* Node name */}
        <span className="flex-1 truncate font-medium text-sm text-white">{displayName}</span>

        {/* Stats badges */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Dependencies count */}
          {node.data.depCount > 0 && (
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[10px]"
              style={{
                backgroundColor: colors.bg,
                color: colors.primary,
                border: `1px solid ${colors.primary}30`,
              }}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                <title>Dependencies</title>
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              {node.data.depCount}
            </div>
          )}

          {/* Scope indicator */}
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: colors.primary,
              boxShadow: `0 0 8px ${colors.primary}`,
            }}
          />

          {/* Dynamic badge */}
          {node.data.aiNode.dynamic && (
            <span
              className="rounded px-1.5 py-0.5 font-black text-[9px]"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.3)',
                color: '#A78BFA',
                border: '1px solid #8B5CF6',
              }}
            >
              DYN
            </span>
          )}

          {/* Cycle indicator */}
          {node.data.isInCycle && (
            <div
              className="flex h-4 w-4 animate-pulse items-center justify-center rounded-full font-bold text-[8px]"
              style={{
                backgroundColor: '#FF006E',
                boxShadow: '0 0 8px #FF006E',
              }}
            >
              ⚠
            </div>
          )}
        </div>
      </div>

      {/* Dependencies hint when collapsed */}
      {hasChildren && !isExpanded && node.data.depCount > 0 && (
        <div className="mt-1 ml-12 text-[10px] text-gray-500" style={{ marginLeft: `${(level + 1) * 24}px` }}>
          {node.data.depCount} 个依赖
        </div>
      )}
    </div>
  )
})

TreeNode.displayName = 'TreeNode'
