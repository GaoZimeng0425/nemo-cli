import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'
import { useRawMode } from '../hooks'

export interface Commit {
  hash: string
  shortHash: string
  author: string
  date: string
  message: string
}

interface CommitViewerProps {
  maxCount?: number
  onSelect: (hash: string) => void
  onExit: () => void
}

export const CommitViewer: FC<CommitViewerProps> = ({ maxCount = 20, onSelect, onExit }) => {
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const { exit } = useApp()

  // Enable raw mode for keyboard input
  useRawMode()

  // Get terminal height
  const terminalHeight = process.stdout.rows || 24
  // Reserve 4 lines for header (2) + hint bar (2)
  const viewHeight = Math.max(5, terminalHeight - 4)

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const [gitError, result] = await xASync(
          'git',
          ['log', `-n ${maxCount}`, '--pretty=format:%H|%an|%ad|%s', '--date=relative'],
          { quiet: true }
        )

        if (gitError) {
          setError(`Failed to fetch commit history: ${gitError.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

        const lines = result.stdout.split('\n').filter(Boolean)
        const parsedCommits: Commit[] = lines.map((line) => {
          const parts = line.split('|')
          if (parts.length < 4) {
            return {
              hash: line,
              shortHash: line.slice(0, 7),
              author: 'Unknown',
              date: '',
              message: line,
            }
          }
          const [hash, author, date, message] = parts as [string, string, string, string]
          return {
            hash,
            shortHash: hash.slice(0, 7),
            author,
            date,
            message,
          }
        })

        setCommits(parsedCommits)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCommits()
  }, [maxCount])

  // Auto-scroll to keep selected item visible
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (commits.length === 0) return

    const halfView = Math.floor(viewHeight / 2)
    if (selectedIndex < scrollTop + 2) {
      setScrollTop(Math.max(0, selectedIndex - 2))
    } else if (selectedIndex > scrollTop + viewHeight - 3) {
      setScrollTop(Math.min(commits.length - viewHeight, selectedIndex - viewHeight + 3))
    }
  }, [selectedIndex, commits.length, viewHeight])

  // Get visible commits
  const visibleCommits = useMemo(() => {
    if (commits.length === 0) return []
    return commits.slice(scrollTop, scrollTop + viewHeight)
  }, [commits, scrollTop, viewHeight])

  // Keyboard input handling
  useInput((input, key) => {
    if (input === 'q') {
      onExit()
      exit()
      return
    }

    if (loading || commits.length === 0) return

    if (key.return) {
      if (commits[selectedIndex]) {
        onSelect(commits[selectedIndex].hash)
      }
      return
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(commits.length - 1, prev + 1))
    }
  })

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading commit history...</Text>
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

  if (commits.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">No commits found.</Text>
      </Box>
    )
  }

  return (
    <Box borderStyle="single" flexDirection="column" width="100%">
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color="cyan">
          Recent Commits ({commits.length})
        </Text>
      </Box>

      {/* Commit list */}
      <Box flexDirection="column" height={viewHeight} paddingX={1}>
        {visibleCommits.map((commit) => {
          const actualIndex = commits.indexOf(commit)
          const isSelected = actualIndex === selectedIndex

          return (
            <Box backgroundColor={isSelected ? 'gray' : undefined} key={commit.hash} marginBottom={1}>
              <Text color={isSelected ? 'white' : 'yellow'}>{isSelected ? '●' : ' '} </Text>
              <Text bold color={isSelected ? 'white' : 'cyan'}>
                {commit.shortHash}
              </Text>
              <Text> </Text>
              <Text color={isSelected ? 'white' : 'green'}>{commit.message}</Text>
              <Text dimColor>
                {' '}
                ({commit.author}, {commit.date})
              </Text>
            </Box>
          )
        })}
      </Box>

      {/* Hint bar */}
      <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
        <Text dimColor> ↑↓/jk: Navigate | Enter: Select | q: Quit</Text>
      </Box>
    </Box>
  )
}

export const renderCommitViewer = (maxCount: number | undefined): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const { unmount } = render(
      <CommitViewer
        maxCount={maxCount}
        onExit={() => {
          unmount()
          resolve(undefined)
        }}
        onSelect={(hash) => {
          unmount()
          resolve(hash)
        }}
      />
    )
  })
}
