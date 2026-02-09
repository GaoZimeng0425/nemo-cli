import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'

export interface ChangedFile {
  path: string
  status: string
}

interface CommitInfo {
  hash: string
  shortHash: string
  author: string
  date: string
  message: string
  files: ChangedFile[]
}

interface CommitDetailProps {
  commitHash: string
  onExit: () => void
}

interface DiffViewerProps {
  commitHash: string
  filePath: string
  scrollTop: number
  visibleLines: number
}

const DiffViewer: FC<DiffViewerProps> = ({ commitHash, filePath, scrollTop, visibleLines }) => {
  const [diffLines, setDiffLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const [error, result] = await xASync('git', ['show', commitHash, '--', filePath], { quiet: true })

        if (error) {
          setDiffLines(['Error loading diff'])
          setLoading(false)
          return
        }

        const lines = result.stdout.split('\n')
        setDiffLines(lines)
      } catch (error) {
        console.error('Failed to fetch diff:', error)
        setDiffLines(['Error loading diff'])
      } finally {
        setLoading(false)
      }
    }

    fetchDiff()
  }, [commitHash, filePath])

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading diff...</Text>
      </Box>
    )
  }

  if (diffLines.length === 0 || (diffLines.length === 1 && diffLines[0] === '')) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No diff available</Text>
      </Box>
    )
  }

  // Show only visible lines
  const visibleLinesData = diffLines.slice(scrollTop, scrollTop + visibleLines)

  return (
    <Box flexDirection="column" paddingX={1}>
      {visibleLinesData.map((line, index) => {
        let color: 'green' | 'red' | 'cyan' | 'yellow' | 'white' | 'gray' = 'white'

        if (line.startsWith('+') && !line.startsWith('+++')) {
          color = 'green'
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          color = 'red'
        } else if (line.startsWith('@@')) {
          color = 'cyan'
        } else if (line.startsWith('diff')) {
          color = 'yellow'
        }

        return (
          <Text color={color} key={index}>
            {line}
          </Text>
        )
      })}

      {/* Show scroll hints */}
      {scrollTop > 0 && (
        <Text color="gray" dimColor>
          ▲
        </Text>
      )}
      {scrollTop + visibleLines < diffLines.length && (
        <Text color="gray" dimColor>
          ▼
        </Text>
      )}
    </Box>
  )
}

type FocusPanel = 'files' | 'diff'

export const CommitDetail: FC<CommitDetailProps> = ({ commitHash, onExit }) => {
  const [commitInfo, setCommitInfo] = useState<CommitInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('files')
  const [diffScrollTop, setDiffScrollTop] = useState(0)

  const app = useApp()
  const { exit } = app

  // Set stdin to raw mode
  useEffect(() => {
    const stdin = (app as unknown as { stdin?: { setRawMode: (mode: boolean) => void } }).stdin
    if (stdin && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(true)
      return () => {
        stdin.setRawMode(false)
      }
    }
  }, [app])

  // Calculate visible lines (terminal height - header - footer - borders)
  const stdout = (app as unknown as { stdout?: { rows: number } }).stdout
  const terminalHeight = stdout?.rows || 24
  const visibleLines = Math.max(10, terminalHeight - 6)

  // File list visible count
  const fileVisibleCount = Math.max(5, terminalHeight - 4)

  // Fetch commit detail
  useEffect(() => {
    const fetchCommitDetail = async () => {
      try {
        const [gitError, result] = await xASync(
          'git',
          ['show', commitHash, '--name-only', '--pretty=format:%H|%an|%ad|%s'],
          { quiet: true }
        )

        if (gitError) {
          setError(`Failed to fetch commit ${commitHash}`)
          setLoading(false)
          return
        }

        const lines = result.stdout.split('\n')
        const [hash, author, date, message] = lines[0].split('|')
        const files = lines
          .slice(1)
          .filter(Boolean)
          .map((path) => ({ path, status: 'M' }))

        setCommitInfo({
          hash,
          shortHash: hash.slice(0, 7),
          author,
          date,
          message,
          files,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCommitDetail()
  }, [commitHash])

  // Reset diff scroll when changing files
  useEffect(() => {
    setDiffScrollTop(0)
  }, [selectedIndex])

  const getVisibleFiles = useCallback(() => {
    if (!commitInfo) return []
    const start = Math.max(0, selectedIndex - Math.floor(fileVisibleCount / 2))
    const end = Math.min(commitInfo.files.length, start + fileVisibleCount)
    return commitInfo.files.slice(start, end)
  }, [commitInfo, selectedIndex, fileVisibleCount])

  useInput((input, key) => {
    if (key.return || input === 'q') {
      onExit()
      exit()
      return
    }

    if (loading || !commitInfo || commitInfo.files.length === 0) return

    if (focusPanel === 'files') {
      // File panel control
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(commitInfo.files.length - 1, prev + 1))
      } else if (key.rightArrow || input === 'l') {
        // Switch to diff panel
        setFocusPanel('diff')
      }
    } else {
      // Diff panel control
      if (key.upArrow || input === 'k') {
        setDiffScrollTop((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setDiffScrollTop((prev) => prev + 1)
      } else if (key.leftArrow || input === 'h') {
        // Switch back to files panel
        setFocusPanel('files')
      }
    }
  })

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading commit detail...</Text>
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

  if (!commitInfo) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error: No commit info loaded</Text>
      </Box>
    )
  }

  if (commitInfo.files.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="green">✓ No files changed in this commit</Text>
      </Box>
    )
  }

  const selectedFile = commitInfo.files[selectedIndex]
  const visibleFiles = getVisibleFiles()

  return (
    <Box flexDirection="row" height={terminalHeight} width="100%">
      {/* Left panel: File list */}
      <Box
        borderColor={focusPanel === 'files' ? 'green' : 'gray'}
        borderStyle="single"
        flexDirection="column"
        paddingX={1}
        width="30%"
      >
        <Box marginBottom={1}>
          <Text bold color={focusPanel === 'files' ? 'green' : 'blue'}>
            Changed Files ({commitInfo.files.length}){focusPanel === 'files' && <Text dimColor> ◀</Text>}
          </Text>
        </Box>

        {visibleFiles.map((file, index) => {
          const actualIndex = commitInfo.files.indexOf(file)
          const isSelected = actualIndex === selectedIndex

          return (
            <Box
              backgroundColor={isSelected ? 'gray' : undefined}
              key={file.path}
              marginBottom={index < visibleFiles.length - 1 ? 1 : 0}
            >
              <Text color={isSelected ? 'white' : 'yellow'}>{isSelected ? '●' : ' '} </Text>
              <Text color={isSelected ? 'white' : 'white'}>{file.path}</Text>
            </Box>
          )
        })}

        <Box marginTop={1}>
          <Text dimColor>
            {focusPanel === 'files' ? (
              <>↑↓/jk Navigate | →/l Diff | Enter/q Quit</>
            ) : (
              <>↑↓/jk Scroll | ←/h Files | Enter/q Quit</>
            )}
          </Text>
        </Box>
      </Box>

      {/* Right panel: Diff content */}
      <Box
        borderColor={focusPanel === 'diff' ? 'green' : 'blue'}
        borderStyle="single"
        flexDirection="column"
        width="70%"
      >
        <Box borderBottom={true} borderColor={focusPanel === 'diff' ? 'green' : 'blue'} paddingX={1}>
          <Text bold color="cyan">
            {commitInfo.shortHash} {commitInfo.message}
          </Text>
          <Text dimColor>
            {' '}
            ({commitInfo.author}, {commitInfo.date}){focusPanel === 'diff' && <Text dimColor> ▶</Text>}
          </Text>
        </Box>

        {selectedFile && (
          <DiffViewer
            commitHash={commitHash}
            filePath={selectedFile.path}
            scrollTop={diffScrollTop}
            visibleLines={visibleLines}
          />
        )}
      </Box>
    </Box>
  )
}

export const renderCommitDetail = (commitHash: string) => {
  const { waitUntilExit } = render(<CommitDetail commitHash={commitHash} onExit={() => {}} />)
  return waitUntilExit()
}
