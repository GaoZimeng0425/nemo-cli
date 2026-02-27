/**
 * Enhanced Control Panel with Cyberpunk Aesthetic
 */

import { useState } from 'react'

import { useGraphStore } from '../store/useGraphStore'
import type { FilterScope } from '../types'

export function ControlPanel() {
  const {
    filteredScopes,
    searchQuery,
    viewMode,
    displayMode,
    selectedEntryNodeId,
    setSearchQuery,
    setViewMode,
    setDisplayMode,
    toggleScopeFilter,
    resetEntrySelection,
    aiOutput,
  } = useGraphStore()

  const [showFilters, setShowFilters] = useState(true)

  const scopeConfig: Record<FilterScope, { label: string; color: string; icon: string }> = {
    app: { label: 'App', color: '#00F0FF', icon: '📱' },
    workspace: { label: 'Workspace', color: '#00FF94', icon: '📦' },
    external: { label: 'External', color: '#FF006E', icon: '🌐' },
    internal: { label: 'Internal', color: '#FFBE0B', icon: '⚙️' },
    other: { label: 'Other', color: '#8B5CF6', icon: '📄' },
  }

  return (
    <div
      className="border-white/10 border-b bg-black/60 px-6 py-4 backdrop-blur-xl"
      style={{
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Title + Filters */}
        <div className="flex flex-1 items-center gap-6">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
              style={{
                background: 'linear-gradient(135deg, #00F0FF20, #00FF9420)',
                border: '1px solid #00F0FF40',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
              }}
            >
              🔗
            </div>
            <div>
              <h1 className="font-black text-lg text-white tracking-tight">
                DEP<span style={{ color: '#00F0FF' }}>VIS</span>
              </h1>
              <p className="font-medium text-[10px] text-gray-400 tracking-wider">DEPENDENCY VISUALIZER</p>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-3 border-white/10 border-l pl-6">
              {/* Scope filters */}
              <div className="flex items-center gap-2">
                {Object.entries(scopeConfig).map(([key, config]) => {
                  const isActive = filteredScopes.includes(key as FilterScope)
                  return (
                    <button
                      className={`relative rounded-lg px-3 py-1.5 font-bold text-xs transition-all duration-200 ${isActive ? 'scale-105' : 'opacity-40 hover:opacity-70'}
                      `}
                      key={key}
                      onClick={() => toggleScopeFilter(key as FilterScope)}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.boxShadow = `0 0 15px ${config.color}20`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                      style={{
                        backgroundColor: isActive ? `${config.color}20` : 'transparent',
                        border: `1px solid ${isActive ? config.color : '#FFFFFF20'}`,
                        color: config.color,
                        boxShadow: isActive ? `0 0 15px ${config.color}40` : 'none',
                      }}
                      type="button"
                    >
                      <span className="mr-1">{config.icon}</span>
                      {config.label}
                    </button>
                  )
                })}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
                <button
                  className={`rounded px-3 py-1 font-bold text-xs transition-all duration-200 ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}
                  `}
                  onClick={() => setViewMode('all')}
                  type="button"
                >
                  ALL
                </button>
                <button
                  className={`rounded px-3 py-1 font-bold text-xs transition-all duration-200 ${viewMode === 'scc' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'}
                  `}
                  onClick={() => setViewMode('scc')}
                  type="button"
                >
                  CYCLES
                </button>
              </div>

              {/* Display mode toggle */}
              <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-1">
                <button
                  className={`rounded px-3 py-1 font-bold text-xs transition-all duration-200 ${displayMode === 'graph' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}
                  `}
                  onClick={() => setDisplayMode('graph')}
                  type="button"
                >
                  🔗 图形
                </button>
                <button
                  className={`rounded px-3 py-1 font-bold text-xs transition-all duration-200 ${displayMode === 'tree' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-green-400'}
                  `}
                  onClick={() => setDisplayMode('tree')}
                  type="button"
                >
                  🌳 树形
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-4">
          {/* Selected entry indicator */}
          {selectedEntryNodeId && (
            <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
              <span className="font-medium text-cyan-400 text-xs">聚焦入口:</span>
              <span className="max-w-[150px] truncate font-bold text-white text-xs">
                {selectedEntryNodeId.split('/').pop() || selectedEntryNodeId}
              </span>
              <button
                className="ml-1 rounded p-0.5 text-cyan-400 transition-colors hover:bg-cyan-500/20"
                onClick={resetEntrySelection}
                title="显示所有入口节点"
                type="button"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <title>Clear selection</title>
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Reset button (only show when entry is selected) */}
          {selectedEntryNodeId && (
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-bold text-gray-400 text-xs transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
              onClick={resetEntrySelection}
              title="显示所有入口节点"
              type="button"
            >
              重置视图
            </button>
          )}

          {/* Search */}
          <div className="relative">
            <input
              className="w-48 rounded-lg border border-white/10 bg-white/5 px-4 py-2 pl-10 font-medium text-white text-xs placeholder-gray-500 transition-all duration-200 focus:border-cyan-400/50 focus:outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              style={{
                backdropFilter: 'blur(10px)',
              }}
              type="text"
              value={searchQuery}
            />
            <svg
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Search</title>
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>

          {/* Toggle filters */}
          <button
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? 'Hide filters' : 'Show filters'}
            type="button"
          >
            {showFilters ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex items-center gap-6 border-white/10 border-t pt-4 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00F0FF', boxShadow: '0 0 8px #00F0FF' }} />
          <span className="text-gray-400">Nodes:</span>
          <span className="font-bold text-white">{aiOutput ? Object.keys(aiOutput.nodes).length : 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00FF94', boxShadow: '0 0 8px #00FF94' }} />
          <span className="text-gray-400">Edges:</span>
          <span className="font-bold text-white">
            {aiOutput ? Object.values(aiOutput.nodes).reduce((sum: number, n) => sum + n.dependencies.length, 0) : 0}
          </span>
        </div>
        {aiOutput?.sccs && aiOutput.sccs.length > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: '#FF006E', boxShadow: '0 0 8px #FF006E' }}
            />
            <span className="text-gray-400">Cycles:</span>
            <span className="font-bold text-red-400">{aiOutput.sccs.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}
