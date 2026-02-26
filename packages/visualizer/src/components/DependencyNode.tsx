/**
 * Enhanced Dependency Node with Cyberpunk Aesthetic
 * Glassmorphism + Neon Glow + Dynamic Animations
 */

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'

import { useGraphStore } from '../store/useGraphStore'
import type { GraphNodeData } from '../types'

// Enhanced color palette with neon effects
const SCOPE_COLORS = {
  app: {
    primary: '#00F0FF',
    secondary: '#00A8B3',
    glow: 'rgba(0, 240, 255, 0.6)',
    bg: 'rgba(0, 240, 255, 0.1)',
  },
  workspace: {
    primary: '#00FF94',
    secondary: '#00B366',
    glow: 'rgba(0, 255, 148, 0.6)',
    bg: 'rgba(0, 255, 148, 0.1)',
  },
  external: {
    primary: '#FF006E',
    secondary: '#B3004D',
    glow: 'rgba(255, 0, 110, 0.6)',
    bg: 'rgba(255, 0, 110, 0.1)',
  },
  internal: {
    primary: '#FFBE0B',
    secondary: '#B38600',
    glow: 'rgba(255, 190, 11, 0.6)',
    bg: 'rgba(255, 190, 11, 0.1)',
  },
  other: {
    primary: '#8B5CF6',
    secondary: '#6D3FA8',
    glow: 'rgba(139, 92, 246, 0.6)',
    bg: 'rgba(139, 92, 246, 0.1)',
  },
}

// Node type variations
const NODE_TYPES = {
  page: { icon: '📄', label: 'PAGE' },
  layout: { icon: '🎨', label: 'LAYOUT' },
  component: { icon: '⚡', label: 'COMP' },
  util: { icon: '🔧', label: 'UTIL' },
  external: { icon: '📦', label: 'PKG' },
  unknown: { icon: '❓', label: '?' },
}

export const DependencyNode = memo(({ data, selected }: NodeProps<GraphNodeData>) => {
  // Progressive expansion hooks
  const toggleNodeExpansion = useGraphStore((state) => state.toggleNodeExpansion)
  const isExpanded = useGraphStore((state) => state.expandedNodeIds.has(data.aiNode.id))
  const hasDependencies = data.depCount > 0
  const canExpand = hasDependencies && data.aiNode.scope !== 'external'

  const colors = SCOPE_COLORS[data.aiNode.scope as keyof typeof SCOPE_COLORS] || SCOPE_COLORS.other
  const nodeType = NODE_TYPES[data.aiNode.type as keyof typeof NODE_TYPES] || NODE_TYPES.unknown
  const isInCycle = data.isInCycle

  // Extract filename for display
  const filename = data.aiNode.id.split('/').pop() || data.aiNode.id
  const displayName = filename.length > 25 ? `${filename.slice(0, 22)}...` : filename

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 bg-black/40 backdrop-blur-xl transition-all duration-300 ${selected ? 'z-50 scale-110' : 'hover:scale-105'}
        ${isInCycle ? 'animate-pulse-slow' : ''}
      `}
      style={{
        borderColor: colors.primary,
        boxShadow: selected
          ? `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}, inset 0 0 20px ${colors.bg}`
          : isInCycle
            ? `0 0 15px ${colors.glow}, 0 0 30px rgba(255, 0, 110, 0.3)`
            : `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px ${colors.secondary}40`,
      }}
    >
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 animate-gradient-shift opacity-20"
        style={{
          background: `linear-gradient(135deg, ${colors.bg} 0%, transparent 50%, ${colors.bg} 100%)`,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(${colors.primary}20 1px, transparent 1px),
            linear-gradient(90deg, ${colors.primary}20 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
        }}
      />

      {/* Top glow bar for entry nodes */}
      {data.dependentCount === 0 && (
        <div
          className="absolute top-0 right-0 left-0 h-1 animate-pulse"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
            boxShadow: `0 0 10px ${colors.primary}`,
          }}
        />
      )}

      {/* Connection handles */}
      <Handle
        className="!w-3 !h-3 !rounded-full !border-2 !border-white !bg-transparent"
        position={Position.Top}
        style={{ boxShadow: `0 0 10px ${colors.primary}` }}
        type="target"
      />
      <Handle
        className="!w-3 !h-3 !rounded-full !border-2 !border-white !bg-transparent"
        position={Position.Bottom}
        style={{ boxShadow: `0 0 10px ${colors.primary}` }}
        type="source"
      />

      {/* Content */}
      <div className="relative z-10 min-w-[200px] max-w-[280px] px-4 py-3">
        {/* Header: Icon + Type Badge */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{nodeType.icon}</span>
            <span
              className="rounded px-2 py-0.5 font-black text-[10px] tracking-wider"
              style={{
                backgroundColor: colors.bg,
                color: colors.primary,
                border: `1px solid ${colors.primary}40`,
              }}
            >
              {nodeType.label}
            </span>
          </div>

          {/* Expand/collapse button or scope indicator */}
          {canExpand ? (
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                toggleNodeExpansion(data.aiNode.id)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 15px ${colors.glow}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
              }}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.primary}40`,
              }}
              type="button"
            >
              <svg
                className="h-3 w-3 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                style={{
                  color: colors.primary,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                viewBox="0 0 24 24"
              >
                <title>Expand/collapse</title>
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </button>
          ) : (
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{
                backgroundColor: colors.primary,
                boxShadow: `0 0 10px ${colors.primary}`,
              }}
            />
          )}
        </div>

        {/* Node name */}
        <div className="mb-3">
          <h3
            className="font-bold text-sm text-white leading-tight"
            style={{
              textShadow: `0 0 20px ${colors.glow}`,
            }}
          >
            {displayName}
          </h3>
          {filename.length > 25 && <div className="mt-1 truncate text-[10px] text-gray-400">{filename}</div>}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          {/* Dependencies */}
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" style={{ color: colors.primary }} viewBox="0 0 24 24">
              <title>Dependencies</title>
              <path
                d="M13 7l5 5m0 0l-5 5m5-5H6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
              />
            </svg>
            <span className="font-bold text-white text-xs">{data.depCount}</span>
          </div>

          {/* Dependents */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-xs">{data.dependentCount}</span>
            <svg className="h-3.5 w-3.5" fill="none" style={{ color: colors.primary }} viewBox="0 0 24 24">
              <title>Dependents</title>
              <path
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
              />
            </svg>
          </div>

          {/* Dynamic badge */}
          {data.aiNode.dynamic && (
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
        </div>

        {/* Hidden dependencies hint */}
        {canExpand && !isExpanded && (
          <div className="mt-2 text-center">
            <span
              className="rounded-full px-2 py-1 font-bold text-[9px] tracking-wide"
              style={{
                backgroundColor: colors.bg,
                color: colors.primary,
                border: `1px solid ${colors.primary}30`,
              }}
            >
              +{data.depCount} 层级
            </span>
          </div>
        )}

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 h-0.5"
          style={{
            width: `${Math.min(100, data.depCount * 10)}%`,
            background: `linear-gradient(90deg, ${colors.primary}, transparent)`,
            boxShadow: `0 0 8px ${colors.primary}`,
          }}
        />
      </div>

      {/* Cycle indicator */}
      {isInCycle && (
        <>
          <div
            className="absolute -top-1 -right-1 h-4 w-4 animate-ping rounded-full"
            style={{ backgroundColor: '#FF006E' }}
          />
          <div
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full font-bold text-[8px]"
            style={{
              backgroundColor: '#FF006E',
              boxShadow: '0 0 10px #FF006E',
            }}
          >
            ⚠
          </div>
        </>
      )}
    </div>
  )
})

DependencyNode.displayName = 'DependencyNode'
