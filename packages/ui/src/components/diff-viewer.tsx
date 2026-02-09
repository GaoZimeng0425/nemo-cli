import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'

interface DiffViewerProps {
  targetBranch?: string
}

interface FileData {
  files: string[]
  loading: boolean
  error: string | null
}

type FocusPanel = 'files' | 'diff'

// Constants
const TERMINAL_HEIGHT_RESERVED = 8
const MIN_VIEW_HEIGHT = 10

// Panel type constants
const PANEL_FILES = 'files' as const
const PANEL_DIFF = 'diff' as const

// Layout constants
const PANEL_WIDTH = '50%' as const

// Color constants
const COLOR_FOCUSED = 'green' as const
const COLOR_UNFOCUSED = 'blue' as const
const COLOR_SELECTED = 'green' as const
const COLOR_NORMAL = 'white' as const
const COLOR_ADDED = 'green' as const
const COLOR_REMOVED = 'red' as const
const COLOR_HUNK_HEADER = 'cyan' as const
const COLOR_BORDER_FOCUSED = 'green' as const
const COLOR_BORDER_UNFOCUSED = 'gray' as const
const COLOR_SCROLL_INDICATOR = 'gray' as const

/**
 * DiffViewer Component
 *
 * Displays git diff in a dual-panel interactive viewer.
 * Left panel shows changed files, right panel shows diff content for selected file.
 * Supports vim-style keyboard navigation and independent panel scrolling.
 *
 * @param targetBranch - Optional target branch to diff against (defaults to working directory)
 *
 * @example
 * ```tsx
 * <DiffViewer targetBranch="main" />
 * ```
 */
export const DiffViewer: FC<DiffViewerProps> = ({ targetBranch }) => {
  const [fileData, setFileData] = useState<FileData>({
    files: [],
    loading: true,
    error: null,
  })
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [diffContent, setDiffContent] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('files')
  const [filesScrollTop, setFilesScrollTop] = useState(0)
  const [diffScrollTop, setDiffScrollTop] = useState(0)

  const { exit } = useApp()

  // Get terminal height
  const terminalHeight = process.stdout.rows || 24
  // Reserve 8 lines for borders and hint bar
  const viewHeight = Math.max(MIN_VIEW_HEIGHT, terminalHeight - TERMINAL_HEIGHT_RESERVED)

  // Ensure selected file is visible in the file list
  useEffect(() => {
    if (fileData.files.length === 0) {
      setSelectedFileIndex(0)
      return
    }

    // Clamp selectedFileIndex to valid range
    const clampedIndex = Math.min(selectedFileIndex, fileData.files.length - 1)
    if (clampedIndex !== selectedFileIndex) {
      setSelectedFileIndex(clampedIndex)
      return
    }

    // Calculate max scroll position
    const maxScroll = Math.max(0, fileData.files.length - viewHeight)

    // Keep selected file visible with some padding
    const padding = 2
    const minVisible = filesScrollTop + padding
    const maxVisible = filesScrollTop + viewHeight - padding - 1

    if (selectedFileIndex < minVisible) {
      // Selected file is above visible area, scroll up
      setFilesScrollTop((prev) => Math.max(0, selectedFileIndex - padding))
    } else if (selectedFileIndex > maxVisible) {
      // Selected file is below visible area, scroll down
      setFilesScrollTop((prev) => Math.min(maxScroll, selectedFileIndex - viewHeight + padding + 1))
    }
  }, [selectedFileIndex, fileData.files.length, viewHeight])

  // Fetch changed files
  useEffect(() => {
    let cancelled = false

    const fetchFiles = async () => {
      try {
        const args = targetBranch ? ['diff', '--name-only', `${targetBranch}...HEAD`] : ['diff', '--name-only']

        const [error, result] = await xASync('git', args, { quiet: true })

        if (cancelled) return

        if (error) {
          setFileData({
            files: [],
            loading: false,
            error: `Failed to fetch changed files: ${error.message || 'Unknown error'}`,
          })
          return
        }

        const files = result.stdout
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.trim())

        if (cancelled) return

        setFileData({
          files,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        setFileData({
          files: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    fetchFiles()

    return () => {
      cancelled = true
    }
  }, [targetBranch])

  // Fetch diff content for selected file
  useEffect(() => {
    let cancelled = false

    const fetchDiff = async () => {
      if (fileData.files.length === 0 || selectedFileIndex >= fileData.files.length) {
        setDiffContent('')
        return
      }

      const selectedFile = fileData.files[selectedFileIndex]
      if (!selectedFile) {
        setDiffContent('')
        return
      }

      setDiffLoading(true)
      try {
        const args = targetBranch
          ? ['diff', `${targetBranch}...HEAD`, '--', selectedFile]
          : ['diff', '--', selectedFile]

        const [error, result] = await xASync('git', args, { quiet: true })

        if (cancelled) return

        if (error) {
          setDiffContent(`Error loading diff for "${selectedFile}": ${error.message || 'Unknown error'}`)
          return
        }

        setDiffContent(result.stdout || 'No changes in this file')
      } catch (err) {
        if (cancelled) return
        setDiffContent(
          `Error loading diff for "${selectedFile}": ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      } finally {
        if (!cancelled) {
          setDiffLoading(false)
        }
      }
    }

    fetchDiff()

    return () => {
      cancelled = true
    }
  }, [selectedFileIndex, fileData.files, targetBranch])

  // Split diff content into lines
  const diffLines = useMemo(() => {
    if (!diffContent) return []
    return diffContent.split('\n')
  }, [diffContent])

  // Calculate max scroll positions
  const maxFilesScroll = Math.max(0, fileData.files.length - viewHeight)
  const maxDiffScroll = Math.max(0, diffLines.length - viewHeight)

  // Keyboard input handling
  useInput((input, key) => {
    if (key.return || input === 'q') {
      exit()
      return
    }

    if (fileData.loading || fileData.files.length === 0) return

    // Panel focus switching
    if (key.leftArrow || input === 'h') {
      if (focusPanel === 'diff') {
        setFocusPanel('files')
      }
      return
    }

    if (key.rightArrow || input === 'l') {
      if (focusPanel === 'files' && fileData.files.length > 0) {
        setFocusPanel('diff')
      }
      return
    }

    // Vertical scrolling and selection
    if (focusPanel === 'files') {
      if (key.upArrow || input === 'k') {
        // Move selection up
        setSelectedFileIndex((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        // Move selection down
        setSelectedFileIndex((prev) => Math.min(fileData.files.length - 1, prev + 1))
      } else if (key.pageUp) {
        // Move selection up by viewHeight
        setSelectedFileIndex((prev) => Math.max(0, prev - viewHeight))
      } else if (key.pageDown) {
        // Move selection down by viewHeight
        setSelectedFileIndex((prev) => Math.min(fileData.files.length - 1, prev + viewHeight))
      }
    } else {
      if (key.upArrow || input === 'k') {
        setDiffScrollTop((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setDiffScrollTop((prev) => Math.min(maxDiffScroll, prev + 1))
      } else if (key.pageUp) {
        setDiffScrollTop((prev) => Math.max(0, prev - viewHeight))
      } else if (key.pageDown) {
        setDiffScrollTop((prev) => Math.min(maxDiffScroll, prev + viewHeight))
      }
    }
  })

  if (fileData.loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading changed files...</Text>
      </Box>
    )
  }

  if (fileData.error) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error: {fileData.error}</Text>
      </Box>
    )
  }

  if (fileData.files.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">No changed files found.</Text>
      </Box>
    )
  }

  // Render file list
  const renderFileList = () => {
    const visibleFiles = fileData.files.slice(filesScrollTop, filesScrollTop + viewHeight)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={focusPanel === PANEL_FILES ? COLOR_FOCUSED : COLOR_UNFOCUSED}>
            Changed Files ({fileData.files.length}){focusPanel === PANEL_FILES && <Text dimColor> ◀</Text>}
          </Text>
        </Box>

        {visibleFiles.map((file, index) => {
          const actualIndex = filesScrollTop + index
          const isSelected = actualIndex === selectedFileIndex

          return (
            <Box
              backgroundColor={isSelected ? 'gray' : undefined}
              key={file}
              marginBottom={index < visibleFiles.length - 1 ? 1 : 0}
            >
              <Text color={isSelected ? COLOR_SELECTED : COLOR_NORMAL}>{isSelected ? '> ' : '  '}</Text>
              <Text color={isSelected ? COLOR_SELECTED : COLOR_NORMAL}>{file}</Text>
            </Box>
          )
        })}

        {/* Scroll indicators */}
        {filesScrollTop > 0 && (
          <Text color={COLOR_SCROLL_INDICATOR} dimColor>
            ▲
          </Text>
        )}
        {filesScrollTop + viewHeight < fileData.files.length && (
          <Text color={COLOR_SCROLL_INDICATOR} dimColor>
            ▼
          </Text>
        )}
      </Box>
    )
  }

  // Render diff content
  const renderDiffContent = () => {
    if (diffLoading) {
      return (
        <Box paddingX={1}>
          <Text dimColor>Loading diff...</Text>
        </Box>
      )
    }

    if (!diffContent) {
      return (
        <Box paddingX={1}>
          <Text dimColor>Select a file to view diff</Text>
        </Box>
      )
    }

    const visibleLines = diffLines.slice(diffScrollTop, diffScrollTop + viewHeight)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={focusPanel === PANEL_DIFF ? COLOR_FOCUSED : COLOR_UNFOCUSED}>
            Diff Content{focusPanel === PANEL_DIFF && <Text dimColor> ◀</Text>}
          </Text>
        </Box>

        {visibleLines.map((line, index) => {
          let lineColor = COLOR_NORMAL
          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineColor = COLOR_ADDED
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineColor = COLOR_REMOVED
          } else if (line.startsWith('@@')) {
            lineColor = COLOR_HUNK_HEADER
          }

          return (
            <Text color={lineColor} key={index}>
              {line || ' '}
            </Text>
          )
        })}

        {/* Scroll indicators */}
        {diffScrollTop > 0 && (
          <Text color={COLOR_SCROLL_INDICATOR} dimColor>
            ▲
          </Text>
        )}
        {diffScrollTop + viewHeight < diffLines.length && (
          <Text color={COLOR_SCROLL_INDICATOR} dimColor>
            ▼
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" height={terminalHeight} width="100%">
      {/* Main content area with two panels */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left panel: File list */}
        <Box
          borderColor={focusPanel === 'files' ? COLOR_BORDER_FOCUSED : COLOR_BORDER_UNFOCUSED}
          borderStyle="single"
          flexDirection="column"
          width={PANEL_WIDTH}
        >
          {renderFileList()}
        </Box>

        {/* Right panel: Diff content */}
        <Box
          borderColor={focusPanel === 'diff' ? COLOR_BORDER_FOCUSED : COLOR_BORDER_UNFOCUSED}
          borderStyle="single"
          flexDirection="column"
          width={PANEL_WIDTH}
        >
          {renderDiffContent()}
        </Box>
      </Box>

      {/* Status bar */}
      <Box
        borderBottom={false}
        borderColor={COLOR_BORDER_UNFOCUSED}
        borderLeft={false}
        borderRight={false}
        borderStyle="single"
      >
        <Text dimColor>
          {' '}
          ←→/hl: Switch Panel | ↑↓/jk: Scroll | PgUp/PgDn | q: Quit | Files {filesScrollTop + 1}-
          {Math.min(filesScrollTop + viewHeight, fileData.files.length)}/{fileData.files.length} Diff{' '}
          {diffScrollTop + 1}-{Math.min(diffScrollTop + viewHeight, diffLines.length)}/{diffLines.length}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Renders the DiffViewer component using Ink's render function.
 *
 * @param targetBranch - Optional target branch to diff against
 * @returns A promise that resolves when the viewer exits
 *
 * @example
 * ```typescript
 * await renderDiffViewer('main')
 * ```
 */
export const renderDiffViewer = (targetBranch?: string) => {
  const { waitUntilExit } = render(<DiffViewer targetBranch={targetBranch} />)
  return waitUntilExit()
}
