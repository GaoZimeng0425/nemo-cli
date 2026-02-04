import type { FC } from 'react'
import { Box, render, Text } from 'ink'

export interface StashItem {
  ref: string
  branch: string
  message: string
  files: string[]
  fileCount: number
}

interface StashListProps {
  stashes: StashItem[]
}

const StashCard: FC<{ stash: StashItem; index: number }> = ({ stash, index }) => {
  const isLast = index === 0 // 最新的是第一个

  return (
    <Box
      borderColor={isLast ? 'green' : 'gray'}
      borderStyle="round"
      flexDirection="column"
      marginBottom={1}
      paddingX={1}
      width={80}
    >
      {/* 标题行 */}
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={isLast ? 'green' : 'gray'}>
            {stash.ref}
          </Text>
          <Text color="gray"> │ </Text>
          <Text color="cyan">{stash.branch}</Text>
        </Box>
        <Text bold color={isLast ? 'green' : 'gray'}>
          {isLast ? '最新' : ''}
        </Text>
      </Box>

      {/* 消息行 */}
      <Box>
        <Text color="gray">└─ </Text>
        <Text dimColor>{stash.message}</Text>
      </Box>

      {/* 文件信息 */}
      <Box marginTop={1}>
        <Text color="yellow">📄 </Text>
        <Text bold color="yellow">
          {stash.fileCount} 个文件
        </Text>
      </Box>

      {/* 文件列表 */}
      {stash.fileCount > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {stash.files.slice(0, 5).map((file, i) => (
            <Text dimColor key={i}>
              • {file}
            </Text>
          ))}
          {stash.fileCount > 5 && <Text dimColor>... 还有 {stash.fileCount - 5} 个文件</Text>}
        </Box>
      )}
    </Box>
  )
}

export const StashList: FC<StashListProps> = ({ stashes }) => {
  if (stashes.length === 0) {
    return (
      <Box>
        <Text color="yellow">没有找到 stash</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="blue">
          📦 找到 {stashes.length} 个 stash
        </Text>
      </Box>

      {/* 列表 */}
      {stashes.map((stash, index) => (
        <StashCard index={index} key={stash.ref} stash={stash} />
      ))}
    </Box>
  )
}

export const renderStashList = (stashes: StashItem[]) => {
  const { waitUntilExit } = render(<StashList stashes={stashes} />)
  return waitUntilExit()
}
