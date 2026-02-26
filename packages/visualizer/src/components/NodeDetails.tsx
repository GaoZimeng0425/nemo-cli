/**
 * NodeDetails panel - Enhanced with Cyberpunk Aesthetic + AI Analysis
 */

import { useEffect, useState } from 'react'

import { loadNodeAnalysis } from '../lib/ai-analysis-loader'
import { useGraphStore } from '../store/useGraphStore'
import type { ComponentAnalysis } from '../types'

export function NodeDetails() {
  const { getSelectedNode, aiOutput, aiDocsBasePath } = useGraphStore()
  const selectedNode = getSelectedNode()
  const [aiAnalysis, setAiAnalysis] = useState<ComponentAnalysis | null>(null)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  // Load AI analysis when node changes
  useEffect(() => {
    if (!selectedNode) {
      setAiAnalysis(null)
      return
    }

    setIsLoadingAnalysis(true)

    // Build the base path for AI docs
    // VITE_AI_DOCS_PATH points to ai-docs/, but we need ai-docs/components/
    const docsBasePath = aiDocsBasePath || '/ai-docs'
    const basePath = docsBasePath.endsWith('/ai-docs') ? `${docsBasePath}/components` : docsBasePath

    console.log('[NodeDetails] Loading AI analysis with basePath:', basePath)

    loadNodeAnalysis(selectedNode.id, basePath)
      .then((analysis) => {
        setAiAnalysis(analysis)
        setIsLoadingAnalysis(false)
      })
      .catch(() => {
        setAiAnalysis(null)
        setIsLoadingAnalysis(false)
      })
  }, [selectedNode, aiDocsBasePath])

  if (!selectedNode || !aiOutput) {
    return (
      <div
        className="w-80 overflow-y-auto border-l p-6"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 255, 148, 0.1))',
              border: '1px solid rgba(0, 240, 255, 0.2)',
            }}
          >
            <svg className="h-8 w-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Node Details</title>
              <path
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">点击节点查看详情</p>
        </div>
      </div>
    )
  }

  const { aiNode, isInCycle, sccGroupId, pages } = selectedNode.data
  const sccGroup = sccGroupId ? aiOutput.sccs.find((s: { id: string }) => s.id === sccGroupId) : null

  const colorsMap: Record<string, { primary: string; bg: string }> = {
    app: { primary: '#00F0FF', bg: 'rgba(0, 240, 255, 0.1)' },
    workspace: { primary: '#00FF94', bg: 'rgba(0, 255, 148, 0.1)' },
    external: { primary: '#FF006E', bg: 'rgba(255, 0, 110, 0.1)' },
    internal: { primary: '#FFBE0B', bg: 'rgba(255, 190, 11, 0.1)' },
    other: { primary: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  }
  const colors = colorsMap[aiNode.scope] || colorsMap.other
  if (!colors) {
    return null
  }

  return (
    <div
      className="w-80 overflow-y-auto border-l p-6"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="mb-3 font-black text-lg text-white">节点详情</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-lg px-3 py-1 font-black text-xs uppercase tracking-wider"
            style={{
              background: colors.bg,
              color: colors.primary,
              border: `1px solid ${colors.primary}40`,
            }}
          >
            {aiNode.type}
          </span>
          {isInCycle && (
            <span className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1 font-black text-red-400 text-xs uppercase tracking-wider">
              循环依赖
            </span>
          )}
          {aiAnalysis && (
            <span
              className="rounded-lg border px-3 py-1 font-black text-xs uppercase tracking-wider"
              style={{
                background:
                  aiAnalysis.analysis.status === 'done' ? 'rgba(0, 255, 148, 0.2)' : 'rgba(255, 190, 11, 0.2)',
                color: aiAnalysis.analysis.status === 'done' ? '#00FF94' : '#FFBE0B',
                borderColor:
                  aiAnalysis.analysis.status === 'done' ? 'rgba(0, 255, 148, 0.4)' : 'rgba(255, 190, 11, 0.4)',
              }}
            >
              AI {aiAnalysis.analysis.status === 'done' ? '✓' : '⏳'}
            </span>
          )}
        </div>
      </div>

      {/* ID */}
      <div className="mb-5">
        <h3 className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">节点 ID</h3>
        <div
          className="break-all rounded-lg p-3 font-mono text-xs"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: colors.primary,
          }}
        >
          {aiNode.id}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5">
        <h3 className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">统计信息</h3>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
            }}
          >
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">依赖</div>
            <div className="font-black text-2xl" style={{ color: '#00F0FF' }}>
              {selectedNode.data.depCount}
            </div>
          </div>
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(0, 255, 148, 0.1)',
              border: '1px solid rgba(0, 255, 148, 0.2)',
            }}
          >
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">被依赖</div>
            <div className="font-black text-2xl" style={{ color: '#00FF94' }}>
              {selectedNode.data.dependentCount}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      {isLoadingAnalysis ? (
        <div className="mb-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-400 text-xs uppercase tracking-wider">
            <span>AI 分析</span>
            <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#FFBE0B' }} />
          </h3>
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: 'rgba(255, 190, 11, 0.1)',
              border: '1px solid rgba(255, 190, 11, 0.2)',
            }}
          >
            <div className="text-amber-300 text-sm">加载分析中...</div>
          </div>
        </div>
      ) : aiAnalysis ? (
        <div className="mb-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-400 text-xs uppercase tracking-wider">
            <span>AI 分析</span>
            {aiAnalysis.analysis.status === 'done' && (
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: '#00FF94', boxShadow: '0 0 8px #00FF94' }}
              />
            )}
            {aiAnalysis.analysis.model && (
              <span className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ color: colors.primary }}>
                {aiAnalysis.analysis.model}
              </span>
            )}
          </h3>

          {/* Summary */}
          {aiAnalysis.analysis.summary && (
            <div
              className="mb-3 rounded-xl p-4"
              style={{
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
              }}
            >
              <div className="mb-2 text-[10px] text-gray-500 uppercase tracking-wider">摘要</div>
              <div className="text-sm text-white leading-relaxed">{aiAnalysis.analysis.summary}</div>
            </div>
          )}

          {/* Full content - expandable */}
          {aiAnalysis.analysis.content && (
            <div>
              <button
                className="mb-3 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all duration-200"
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                style={{
                  background: showFullAnalysis ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                }}
                type="button"
              >
                <span className="font-bold text-cyan-400 text-sm">完整分析</span>
                <span className="text-gray-400 text-xs">{showFullAnalysis ? '收起 ▲' : '展开 ▼'}</span>
              </button>

              {showFullAnalysis && (
                <div
                  className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl p-4 text-sm leading-relaxed"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e0e0e0',
                  }}
                >
                  {aiAnalysis.analysis.content}
                </div>
              )}
            </div>
          )}

          {/* Error status */}
          {aiAnalysis.analysis.status === 'error' && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(255, 0, 110, 0.1)',
                border: '1px solid rgba(255, 0, 110, 0.3)',
              }}
            >
              <div className="mb-1 font-bold text-red-300 text-xs">分析失败</div>
              <div className="text-red-400 text-xs">{aiAnalysis.analysis.error}</div>
            </div>
          )}

          {/* Skipped status */}
          {aiAnalysis.analysis.status === 'skipped' && aiAnalysis.analysis.content && (
            <div
              className="rounded-xl p-4 text-gray-400 text-xs"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {aiAnalysis.analysis.content}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5">
          <h3 className="mb-3 font-bold text-gray-400 text-xs uppercase tracking-wider">AI 分析</h3>
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="mb-2 text-gray-500 text-sm">该节点暂无 AI 分析</div>
            <div className="text-gray-600 text-xs">
              运行 <code className="rounded bg-black/40 px-2 py-1 text-cyan-400">nd ai</code> 生成分析结果
            </div>
          </div>
        </div>
      )}

      {/* File info */}
      <div className="mb-5">
        <h3 className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">文件信息</h3>
        <div className="space-y-2 text-sm">
          {aiNode.path && (
            <div>
              <span className="text-gray-500 text-xs">路径:</span>
              <p className="mt-1 break-all text-gray-200">{aiNode.path}</p>
            </div>
          )}
          {aiNode.packageName && (
            <div>
              <span className="text-gray-500 text-xs">包名:</span>
              <p className="mt-1 text-white">{aiNode.packageName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dependencies */}
      {aiNode.dependencies.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">
            依赖 ({aiNode.dependencies.length})
          </h3>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {aiNode.dependencies.map((dep: string) => {
              const depNode = aiOutput.nodes[dep]
              const depIsInCycle = !!aiOutput.nodeToScc[dep]
              return (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  key={dep}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {depIsInCycle && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: '#FF006E', boxShadow: '0 0 8px #FF006E' }}
                    />
                  )}
                  <span className="flex-1 truncate text-gray-300">{dep}</span>
                  {depNode && (
                    <span
                      className="rounded px-2 py-0.5 font-bold text-[10px] uppercase"
                      style={{ color: colors.primary }}
                    >
                      {depNode.type}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SCC info */}
      {isInCycle && sccGroup && (
        <div
          className="mb-5 rounded-xl p-4"
          style={{
            background: 'rgba(255, 0, 110, 0.1)',
            border: '1px solid rgba(255, 0, 110, 0.3)',
            boxShadow: '0 0 20px rgba(255, 0, 110, 0.1)',
          }}
        >
          <h3 className="mb-2 flex items-center gap-2 font-black text-red-400 text-sm">
            <span>⚠</span>
            <span>循环依赖 (SCC)</span>
          </h3>
          <p className="mb-3 text-red-300 text-xs">此节点是循环依赖的一部分，包含 {sccGroup.nodes.length} 个节点</p>
          <div className="max-h-32 overflow-y-auto">
            <ul className="space-y-1">
              {sccGroup.nodes.map((nodeId: string) => (
                <li
                  className={`rounded px-3 py-2 text-xs ${
                    nodeId === aiNode.id ? 'bg-red-500/30 font-medium text-red-200' : 'bg-black/30 text-gray-400'
                  }`}
                  key={nodeId}
                >
                  {nodeId}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Pages */}
      {pages.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 font-bold text-gray-400 text-xs uppercase tracking-wider">所属页面 ({pages.length})</h3>
          <div className="space-y-1">
            {pages.map((pageId) => {
              const page = aiOutput.pages[pageId]
              return (
                <div
                  className="rounded-lg px-3 py-2 text-sm"
                  key={pageId}
                  style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.1)',
                  }}
                >
                  <div className="text-white">{page?.route || pageId}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">({page?.routeType || 'unknown'})</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Open in editor button */}
      <button
        className="w-full rounded-lg px-4 py-3 font-bold text-sm transition-all duration-200"
        onClick={() => {
          console.log('Open in editor:', aiNode.path)
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 20px ${colors.primary}40`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none'
        }}
        style={{
          background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primary}10)`,
          border: `1px solid ${colors.primary}50`,
          color: colors.primary,
        }}
        type="button"
      >
        在编辑器中打开
      </button>
    </div>
  )
}
