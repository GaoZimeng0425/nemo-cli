import type React from 'react'
import { useCallback, useState } from 'react'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
}

export default function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        setFileName(file.name)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files[0]
      if (file) {
        setFileName(file.name)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ background: '#0a0a0f' }}>
      {/* Animated background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(0, 240, 255, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(0, 255, 148, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className="relative w-full max-w-2xl rounded-2xl p-10"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="text-center">
          {/* Logo */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-2xl text-4xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 255, 148, 0.2))',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)',
            }}
          >
            🔗
          </div>

          {/* Title */}
          <h1 className="mb-2 font-black text-4xl text-white tracking-tight">
            DEP<span style={{ color: '#00F0FF' }}>VIS</span>
          </h1>
          <p className="mb-8 font-medium text-gray-400 text-sm tracking-widest">DEPENDENCY VISUALIZER</p>

          {/* Upload area */}
          <div
            className={`relative rounded-2xl border-2 p-12 transition-all duration-300 ${isDragging ? 'scale-[1.02] border-cyan-400' : 'border-white/10'}
            `}
            style={{
              background: isDragging ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
              }}
            >
              <svg className="h-8 w-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>Upload icon</title>
                <path
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <label className="cursor-pointer" htmlFor="file-upload">
              <span className="mb-1 block font-medium text-white">拖拽文件到此处，或点击选择</span>
              <span className="block text-gray-500 text-sm">
                上传 <code className="rounded bg-black/40 px-2 py-0.5 text-cyan-400">deps.ai.json</code> 文件
              </span>
              <input accept=".json" className="sr-only" id="file-upload" onChange={handleFileSelect} type="file" />
            </label>
          </div>

          {/* File info */}
          {fileName && (
            <div
              className="mt-4 flex items-center gap-3 rounded-xl p-4"
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
              }}
            >
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ backgroundColor: '#00F0FF', boxShadow: '0 0 10px #00F0FF' }}
              />
              <p className="font-medium text-cyan-300 text-sm">
                已选择: <span className="text-white">{fileName}</span>
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 rounded-xl p-5" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
            <p className="mb-3 text-gray-400 text-xs">尚未生成依赖文件？在 Next.js 项目中运行：</p>
            <pre
              className="overflow-x-auto rounded-lg px-4 py-3 font-mono text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ color: '#00FF94' }}>nd</span> <span style={{ color: '#00F0FF' }}>analyze</span>{' '}
              <span style={{ color: '#FFBE0B' }}>--format</span> <span style={{ color: '#FF006E' }}>ai</span>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
