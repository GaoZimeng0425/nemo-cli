import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h1 className="mb-4 font-bold text-red-600 text-xl">出现错误</h1>
            <p className="mb-4 text-gray-700">应用程序遇到了一个错误。请尝试刷新页面或重新加载文件。</p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-gray-600 text-sm">错误详情</summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs">{this.state.error.toString()}</pre>
              </details>
            )}
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => window.location.reload()}
              type="button"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
