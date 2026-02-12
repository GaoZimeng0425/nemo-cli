import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'
import { useRawMode } from '../hooks'

interface HistViewerProps {
  maxCount?: number
}

export const HistViewer: FC<HistViewerProps> = ({ maxCount }) => {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [lastKey, setLastKey] = useState<string>('')

  const { exit } = useApp()

  // Enable raw mode for keyboard input
  useRawMode()

  // Get terminal height, fallback to 24
  const terminalHeight = process.stdout.rows || 24
  // Reserve 6 lines for border (2) + hint bar (2) + marginTop (2)
  const viewHeight = Math.max(10, terminalHeight - 8)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const args = [
          'log',
          '--graph',
          '--abbrev-commit',
          '--date=format:%Y-%m-%d %H:%M:%S',
          '--format=%C(bold cyan)%h%Creset %Cgreen%ad%Creset %C(magenta)[%an]%Creset%C(yellow)%d%Creset%n  %s',
          '--color=always',
        ]

        if (maxCount) {
          args.splice(1, 0, `-${maxCount}`)
        }

        const [gitError, result] = await xASync('git', args, { quiet: true })

        if (gitError) {
          setError(`Failed to fetch git history: ${gitError.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

        setOutput(result.stdout)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [maxCount])

  // Split output into lines
  const lines = useMemo(() => {
    if (!output) return []
    return output.split('\n')
  }, [output])

  // Calculate max scroll position
  const maxScroll = Math.max(0, lines.length - viewHeight)

  // Auto-reset lastKey after 500ms for 'gg' shortcut
  useEffect(() => {
    if (lastKey) {
      const timer = setTimeout(() => setLastKey(''), 500)
      return () => clearTimeout(timer)
    }
  }, [lastKey])

  // Keyboard input handling
  useInput((input, key) => {
    if (key.return || input === 'q') {
      exit()
      return
    }

    if (loading || lines.length === 0) return

    // Handle 'gg' sequence (vim: jump to top)
    if (input === 'g') {
      if (lastKey === 'g') {
        setScrollTop(0)
        setLastKey('')
        return
      }
      setLastKey('g')
      return
    }

    if (lastKey) setLastKey('')

    if (key.upArrow || input === 'k') {
      setScrollTop((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setScrollTop((prev) => Math.min(maxScroll, prev + 1))
    } else if (input === 'G') {
      // Shift+G: jump to bottom
      setScrollTop(maxScroll)
    } else if (key.pageUp) {
      setScrollTop((prev) => Math.max(0, prev - viewHeight))
    } else if (key.pageDown) {
      setScrollTop((prev) => Math.min(maxScroll, prev + viewHeight))
    }
  })

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading git history...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
  }

  if (!output.trim()) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">No git history found.</Text>
      </Box>
    )
  }

  // Get visible lines
  const visibleLines = lines.slice(scrollTop, scrollTop + viewHeight)

  return (
    <Box borderStyle="single" flexDirection="column" width="100%">
      {/* Git history content */}
      <Box flexDirection="column" height={viewHeight} paddingX={1}>
        {visibleLines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: index is stable within slice
          <Text key={index} wrap="truncate-end">
            {line || ' '}
          </Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
        <Text dimColor>
          {' '}
          ↑↓/jk: Scroll | gg/G: Top/Bottom | PgUp/PgDn | q: Quit | Lines {scrollTop + 1}-
          {Math.min(scrollTop + viewHeight, lines.length)}/{lines.length}
        </Text>
      </Box>
    </Box>
  )
}

export const renderHistViewer = (maxCount?: number) => {
  const { waitUntilExit } = render(<HistViewer maxCount={maxCount} />)
  return waitUntilExit()
}
