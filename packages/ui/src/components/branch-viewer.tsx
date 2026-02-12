import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'
import { useRawMode } from '../hooks'

interface BranchViewerProps {
  maxCount?: number
}

interface BranchData {
  branches: string[]
  currentBranch: string
  loading: boolean
  error: string | null
}

type FocusPanel = 'local' | 'remote'

// Constants
const TERMINAL_HEIGHT_RESERVED = 8
const MIN_VIEW_HEIGHT = 10

// Panel type constants
const PANEL_LOCAL = 'local' as const
const PANEL_REMOTE = 'remote' as const

// Helper function to format branch names
const formatBranchName = (branch: string): string => branch.trim().replace(/^origin\//, '')

// Helper function to clean branch list
const cleanBranchList = (lines: string[]): string[] =>
  lines
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) =>
      line
        .trim()
        .replace(/^\*\s*/, '')
        .trim()
    )

/**
 * BranchViewer Component
 *
 * Displays local and remote git branches in a dual-panel interactive viewer.
 * Supports vim-style keyboard navigation and independent panel scrolling.
 *
 * @param maxCount - Optional limit on the number of branches to display
 *
 * @example
 * ```tsx
 * <BranchViewer maxCount={20} />
 * ```
 */
export const BranchViewer: FC<BranchViewerProps> = ({ maxCount }) => {
  const [localBranchData, setLocalBranchData] = useState<BranchData>({
    branches: [],
    currentBranch: '',
    loading: true,
    error: null,
  })
  const [remoteBranchData, setRemoteBranchData] = useState<BranchData>({
    branches: [],
    currentBranch: '',
    loading: true,
    error: null,
  })
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('local')
  const [localScrollTop, setLocalScrollTop] = useState(0)
  const [remoteScrollTop, setRemoteScrollTop] = useState(0)

  const { exit } = useApp()

  // Enable raw mode for keyboard input
  useRawMode()

  // Get terminal height
  const terminalHeight = process.stdout.rows || 24
  // Reserve 6 lines for borders and hint bar
  const viewHeight = Math.max(MIN_VIEW_HEIGHT, terminalHeight - TERMINAL_HEIGHT_RESERVED)

  // Fetch local branches
  useEffect(() => {
    const fetchLocalBranches = async () => {
      try {
        const args = ['branch', '--sort=-committerdate']
        if (maxCount) {
          args.push(`-${maxCount}`)
        }

        const [error, result] = await xASync('git', args, { quiet: true })

        if (error) {
          setLocalBranchData({
            branches: [],
            currentBranch: '',
            loading: false,
            error: `Failed to fetch local branches: ${error.message || 'Unknown error'}`,
          })
          return
        }

        const lines = result.stdout.split('\n')
        const currentLine = lines.find((line) => line.includes('*')) || '*'
        const currentBranch = currentLine.replace(/^\*\s*/, '').trim()
        const branches = cleanBranchList(lines)

        setLocalBranchData({
          branches,
          currentBranch,
          loading: false,
          error: null,
        })
      } catch (err) {
        setLocalBranchData({
          branches: [],
          currentBranch: '',
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    fetchLocalBranches()
  }, [maxCount])

  // Fetch remote branches
  useEffect(() => {
    const fetchRemoteBranches = async () => {
      try {
        const args = ['branch', '-r', '--sort=-committerdate']
        if (maxCount) {
          args.push(`-${maxCount}`)
        }

        const [error, result] = await xASync('git', args, { quiet: true })

        if (error) {
          setRemoteBranchData({
            branches: [],
            currentBranch: '',
            loading: false,
            error: `Failed to fetch remote branches: ${error.message || 'Unknown error'}`,
          })
          return
        }

        const branches = result.stdout
          .split('\n')
          .filter((line) => line.trim() && !line.includes('->'))
          .map(formatBranchName)

        setRemoteBranchData({
          branches,
          currentBranch: '',
          loading: false,
          error: null,
        })
      } catch (err) {
        setRemoteBranchData({
          branches: [],
          currentBranch: '',
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    fetchRemoteBranches()
  }, [maxCount])

  // Keyboard input handling
  useInput((input, key) => {
    if (key.return || input === 'q') {
      exit()
      return
    }

    // Panel focus switching
    if (key.leftArrow || input === 'h') {
      if (focusPanel === 'remote') {
        setFocusPanel('local')
      }
      return
    }

    if (key.rightArrow || input === 'l') {
      if (focusPanel === 'local') {
        setFocusPanel('remote')
      }
      return
    }

    // Vertical scrolling
    if (focusPanel === 'local') {
      const maxScroll = Math.max(0, localBranchData.branches.length - viewHeight)
      if (key.upArrow || input === 'k') {
        setLocalScrollTop((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setLocalScrollTop((prev) => Math.min(maxScroll, prev + 1))
      } else if (key.pageUp) {
        setLocalScrollTop((prev) => Math.max(0, prev - viewHeight))
      } else if (key.pageDown) {
        setLocalScrollTop((prev) => Math.min(maxScroll, prev + viewHeight))
      }
    } else {
      const maxScroll = Math.max(0, remoteBranchData.branches.length - viewHeight)
      if (key.upArrow || input === 'k') {
        setRemoteScrollTop((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setRemoteScrollTop((prev) => Math.min(maxScroll, prev + 1))
      } else if (key.pageUp) {
        setRemoteScrollTop((prev) => Math.max(0, prev - viewHeight))
      } else if (key.pageDown) {
        setRemoteScrollTop((prev) => Math.min(maxScroll, prev + viewHeight))
      }
    }
  })

  // Render branch list
  const renderBranchList = (data: BranchData, scrollTop: number, panelType: FocusPanel) => {
    const title = panelType === PANEL_LOCAL ? 'Local' : 'Remote'

    if (data.loading) {
      return (
        <Box paddingX={1}>
          <Text dimColor>Loading...</Text>
        </Box>
      )
    }

    if (data.error) {
      return (
        <Box paddingX={1}>
          <Text color="red">Error: {data.error}</Text>
        </Box>
      )
    }

    if (data.branches.length === 0) {
      return (
        <Box paddingX={1}>
          <Text color="yellow">No branches found</Text>
        </Box>
      )
    }

    const visibleBranches = data.branches.slice(scrollTop, scrollTop + viewHeight)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={focusPanel === panelType ? 'green' : 'blue'}>
            {title} Branches ({data.branches.length}){focusPanel === panelType && <Text dimColor> ◀</Text>}
          </Text>
        </Box>

        {visibleBranches.map((branch, index) => {
          const isCurrent = branch === data.currentBranch
          const actualIndex = scrollTop + index

          return (
            <Box
              backgroundColor={isCurrent ? 'gray' : undefined}
              key={branch}
              marginBottom={index < visibleBranches.length - 1 ? 1 : 0}
            >
              <Text color={isCurrent ? 'green' : 'white'}>
                {isCurrent ? '* ' : '  '}
                {branch}
              </Text>
            </Box>
          )
        })}

        {/* Scroll indicators */}
        {scrollTop > 0 && (
          <Text color="gray" dimColor>
            ▲
          </Text>
        )}
        {scrollTop + viewHeight < data.branches.length && (
          <Text color="gray" dimColor>
            ▼
          </Text>
        )}
      </Box>
    )
  }

  if (localBranchData.loading || remoteBranchData.loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading branch information...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" height={terminalHeight} width="100%">
      {/* Main content area with two panels */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left panel: Local branches */}
        <Box
          borderColor={focusPanel === 'local' ? 'green' : 'gray'}
          borderStyle="single"
          flexDirection="column"
          width="50%"
        >
          {renderBranchList(localBranchData, localScrollTop, PANEL_LOCAL)}
        </Box>

        {/* Right panel: Remote branches */}
        <Box
          borderColor={focusPanel === 'remote' ? 'green' : 'gray'}
          borderStyle="single"
          flexDirection="column"
          width="50%"
        >
          {renderBranchList(remoteBranchData, remoteScrollTop, PANEL_REMOTE)}
        </Box>
      </Box>

      {/* Status bar */}
      <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
        <Text dimColor>
          {' '}
          ←→/hl: Switch Panel | ↑↓/jk: Scroll | PgUp/PgDn | q: Quit | Local: {localScrollTop + 1}-
          {Math.min(localScrollTop + viewHeight, localBranchData.branches.length)}/{localBranchData.branches.length}{' '}
          Remote: {remoteScrollTop + 1}-{Math.min(remoteScrollTop + viewHeight, remoteBranchData.branches.length)}/
          {remoteBranchData.branches.length}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Renders the BranchViewer component using Ink's render function.
 *
 * @param maxCount - Optional limit on the number of branches to display
 * @returns A promise that resolves when the viewer exits
 *
 * @example
 * ```typescript
 * await renderBranchViewer(20)
 * ```
 */
export const renderBranchViewer = (maxCount?: number) => {
  const { waitUntilExit } = render(<BranchViewer maxCount={maxCount} />)
  return waitUntilExit()
}
