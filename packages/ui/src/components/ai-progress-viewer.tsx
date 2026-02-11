import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from '@inkjs/ui'
import { Box, render, Text, useApp, useInput } from 'ink'

import Provider from './provider'
export type AiProgressStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export type AiProgressUpdate = {
  total: number
  completed: number
  status: AiProgressStatus
  current?: string
  message?: string
}

interface AiProgressViewerProps {
  title: string
  onStart: (emit: (update: AiProgressUpdate) => void, signal: AbortSignal) => Promise<void>
  onExit?: () => void
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const renderBar = (completed: number, total: number, width: number) => {
  if (total <= 0) return '[----------]'
  const ratio = clamp(completed / total, 0, 1)
  const filled = Math.round(ratio * width)
  const empty = Math.max(0, width - filled)
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`
}

export const AiProgressViewer: FC<AiProgressViewerProps> = ({ title, onStart, onExit }) => {
  const [update, setUpdate] = useState<AiProgressUpdate>({
    total: 0,
    completed: 0,
    status: 'pending',
  })
  const [messages, setMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const { exit } = useApp()

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller

    const emit = (next: AiProgressUpdate) => {
      setUpdate(next)
      if (next.message) {
        setMessages((prev) => [...prev.slice(-4), next.message ?? ''])
      }
    }

    const start = async () => {
      try {
        await onStart(emit, controller.signal)
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    start()
  }, [onStart])

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      controllerRef.current?.abort()
      onExit?.()
      exit()
    }
  })

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => {
      onExit?.()
      exit()
    }, 300)
    return () => clearTimeout(timer)
  }, [done, exit, onExit])

  const barWidth = useMemo(() => {
    const columns = process.stdout.columns || 80
    return clamp(columns - 20, 10, 40)
  }, [])

  if (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
  }

  return (
    <Provider>
      <Box borderStyle="single" flexDirection="column" width="100%">
        <Box paddingX={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>

        <Box flexDirection="column" paddingX={1}>
          <Box alignItems="center" gap={1}>
            {!done ? <Spinner /> : <Text color="green">Done</Text>}
            <Text>{update.current ?? 'Preparing...'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text>
              {renderBar(update.completed, update.total, barWidth)} {update.completed}/{update.total}
            </Text>
          </Box>
          {messages.length > 0 ? (
            <Box flexDirection="column" marginTop={1}>
              {messages.map((message, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable for short list
                <Text dimColor key={index}>
                  {message}
                </Text>
              ))}
            </Box>
          ) : null}
        </Box>

        <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
          <Text dimColor> q: Quit</Text>
        </Box>
      </Box>
    </Provider>
  )
}

export const renderAiProgressViewer = (props: AiProgressViewerProps): Promise<void> => {
  return new Promise((resolve) => {
    const { unmount, waitUntilExit } = render(<AiProgressViewer {...props} />)
    waitUntilExit().then(() => {
      unmount()
      resolve()
    })
  })
}
