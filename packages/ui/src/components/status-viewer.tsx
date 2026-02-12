import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { xASync } from '@nemo-cli/shared'
import { useRawMode } from '../hooks'

export interface StatusFile {
  path: string
  status: string
  staged: boolean
}

interface StatusViewerProps {
  files: StatusFile[]
  onExit: () => void
}

const DiffViewer: FC<{ filePath: string; scrollTop: number; visibleLines: number }> = ({
  filePath,
  scrollTop,
  visibleLines,
}) => {
  const [diffLines, setDiffLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const [error, result] = await xASync('git', ['diff', filePath], { quiet: true })

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
  }, [filePath])

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

  // 只显示可见行
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

      {/* 显示滚动提示 */}
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

export const StatusViewer: FC<StatusViewerProps> = ({ files, onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('files')
  const [diffScrollTop, setDiffScrollTop] = useState(0)
  const app = useApp()
  const { exit } = app

  // Enable raw mode for keyboard input
  useRawMode()

  // 计算可见行数（终端高度 - 顶部信息行 - 底部提示行 - 边框）
  const stdout = (app as { stdout?: { rows: number } }).stdout
  const terminalHeight = stdout?.rows || 24
  const visibleLines = Math.max(10, terminalHeight - 6) // 保留 6 行给边框和提示信息

  // 文件列表可见数量
  const fileVisibleCount = Math.max(5, terminalHeight - 4)

  const getVisibleFiles = () => {
    const start = Math.max(0, selectedIndex - Math.floor(fileVisibleCount / 2))
    const end = Math.min(files.length, start + fileVisibleCount)
    return files.slice(start, end)
  }

  useInput((input, key) => {
    if (key.return || input === 'q') {
      onExit()
      exit()
      return
    }

    if (focusPanel === 'files') {
      // 文件列表面板控制
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(files.length - 1, prev + 1))
      } else if (key.rightArrow || input === 'l') {
        // 切换到 diff 面板
        setFocusPanel('diff')
        setDiffScrollTop(0) // 重置滚动位置
      }
    } else {
      // diff 面板控制
      if (key.upArrow || input === 'k') {
        setDiffScrollTop((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow || input === 'j') {
        setDiffScrollTop((prev) => prev + 1)
      } else if (key.leftArrow || input === 'h') {
        // 切换回文件列表面板
        setFocusPanel('files')
      }
    }
  })

  if (files.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="green">✓ Working directory clean</Text>
      </Box>
    )
  }

  const selectedFile = files[selectedIndex]
  if (!selectedFile) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="red">Error: No file selected</Text>
      </Box>
    )
  }
  const visibleFiles = getVisibleFiles()

  return (
    <Box flexDirection="row" height={terminalHeight} width="100%">
      {/* 左侧：文件列表 */}
      <Box
        borderColor={focusPanel === 'files' ? 'green' : 'gray'}
        borderStyle="single"
        flexDirection="column"
        paddingX={1}
        width="30%"
      >
        <Box marginBottom={1}>
          <Text bold color={focusPanel === 'files' ? 'green' : 'blue'}>
            Changed Files ({files.length}){focusPanel === 'files' && <Text dimColor> ◀</Text>}
          </Text>
        </Box>

        {visibleFiles.map((file, index) => {
          const actualIndex = files.indexOf(file)
          const isSelected = actualIndex === selectedIndex

          return (
            <Box
              backgroundColor={isSelected ? 'gray' : undefined}
              key={file.path}
              marginBottom={index < visibleFiles.length - 1 ? 1 : 0}
            >
              <Text color={file.status === 'M' ? 'yellow' : 'green'}>
                {file.staged ? '✓' : ' '} {file.status} {file.path}
              </Text>
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

      {/* 右侧：Diff 内容 */}
      <Box
        borderColor={focusPanel === 'diff' ? 'green' : 'blue'}
        borderStyle="single"
        flexDirection="column"
        width="70%"
      >
        <Box borderBottom={true} borderColor={focusPanel === 'diff' ? 'green' : 'blue'} paddingX={1}>
          <Text bold color="cyan">
            {selectedFile.path}
          </Text>
          <Text dimColor>
            {' '}
            ({selectedFile.staged ? 'Staged' : 'Unstaged'}){focusPanel === 'diff' && <Text dimColor> ▶</Text>}
          </Text>
        </Box>

        <DiffViewer filePath={selectedFile.path} scrollTop={diffScrollTop} visibleLines={visibleLines} />
      </Box>
    </Box>
  )
}

export const renderStatusViewer = (files: StatusFile[]) => {
  const { rerender, unmount } = render(<StatusViewer files={files} onExit={() => unmount()} />)
  return { rerender, unmount }
}
