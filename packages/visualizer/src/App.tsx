import { useCallback, useState } from 'react'

import { ControlPanel } from './components/ControlPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import FileUploader from './components/FileUploader'
import { GraphView } from './components/GraphView'
import { NodeDetails } from './components/NodeDetails'
import { TreeView } from './components/TreeView'
import { buildReactFlowGraph } from './lib/graph-builder'
import { parseWithWorker } from './lib/worker-wrapper'
import { useGraphStore } from './store/useGraphStore'

function App() {
  const { loadAiOutput, setLoading, setError, isLoading, error, aiOutput, displayMode } = useGraphStore()
  const [showGraph, setShowGraph] = useState(false)

  const handleFileSelect = useCallback(
    async (file: File) => {
      setLoading(true)
      setError(null)

      try {
        // Parse JSON file
        const output = await parseWithWorker(file)

        // Build graph with force-directed layout
        const { nodes, edges } = await buildReactFlowGraph(output)

        // Load into store with layouted nodes
        loadAiOutput(output, nodes, edges)

        setShowGraph(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        setError(message)
        console.error('Failed to load file:', error)
      } finally {
        setLoading(false)
      }
    },
    [loadAiOutput, setLoading, setError]
  )

  const handleReset = useCallback(() => {
    setShowGraph(false)
    useGraphStore.getState().clearData()
  }, [])

  // Show uploader while no data
  if (!showGraph && !aiOutput) {
    return (
      <ErrorBoundary>
        <div className="h-full w-full">
          <FileUploader onFileSelect={handleFileSelect} />
        </div>
      </ErrorBoundary>
    )
  }

  // Show graph view
  return (
    <ErrorBoundary>
      <div className="relative flex h-screen w-full flex-col" style={{ background: '#0a0a0f' }}>
        {/* Cyberpunk background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(0, 255, 148, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 70%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Header */}
        <div
          className="relative z-10 flex items-center justify-between border-b px-6 py-3"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #00F0FF30, #00FF9430)',
                border: '1px solid #00F0FF50',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
              }}
            >
              🔗
            </div>
            <div>
              <h1 className="font-black text-base text-white tracking-tight">
                DEP<span style={{ color: '#00F0FF' }}>VIS</span>
              </h1>
            </div>
          </div>
          <button
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-bold text-cyan-400 text-xs transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-500/20"
            onClick={handleReset}
            style={{
              backdropFilter: 'blur(10px)',
            }}
            type="button"
          >
            上传新文件
          </button>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Left side: Graph + Controls */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Control panel */}
            <ControlPanel />

            {/* Graph view */}
            <div className="relative flex-1">
              {isLoading && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  style={{ background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="text-center">
                    <div
                      className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full"
                      style={{
                        border: '3px solid rgba(0, 240, 255, 0.2)',
                        borderTopColor: '#00F0FF',
                        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
                      }}
                    />
                    <p className="font-medium text-white">正在加载依赖关系...</p>
                    <p className="mt-1 text-gray-400 text-sm">构建可视化图表</p>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(10px)' }}
                >
                  <div
                    className="max-w-md rounded-xl border p-6"
                    style={{
                      background: 'rgba(255, 0, 110, 0.1)',
                      borderColor: 'rgba(255, 0, 110, 0.3)',
                      boxShadow: '0 0 30px rgba(255, 0, 110, 0.2)',
                    }}
                  >
                    <h3 className="mb-2 font-bold text-lg text-red-400">加载失败</h3>
                    <p className="mb-4 text-red-300">{error}</p>
                    <button
                      className="w-full rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-red-400 transition-all duration-200 hover:bg-red-500/30"
                      onClick={handleReset}
                      type="button"
                    >
                      重新选择文件
                    </button>
                  </div>
                </div>
              )}

              {displayMode === 'graph' ? <GraphView /> : <TreeView />}
            </div>
          </div>

          {/* Right side: Node details */}
          <NodeDetails />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
