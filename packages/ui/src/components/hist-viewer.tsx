import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { Box, render, Text } from 'ink'

import { xASync } from '@nemo-cli/shared'

interface HistViewerProps {
  maxCount?: number
}

export const HistViewer: FC<HistViewerProps> = ({ maxCount }) => {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const args = [
          'log',
          '--graph',
          '--abbrev-commit',
          '--date=format:%Y-%m-%d %H:%M:%S',
          '--format=%C(bold cyan)%h%Creset - %Cgreen%ad%Creset %C(magenta)[%an]%Creset%n%s %C(yellow)%d',
          '--color=always', // 强制启用颜色输出
        ]

        if (maxCount) {
          args.splice(1, 0, `-${maxCount}`)
        }

        const [gitError, result] = await xASync('git', args, { quiet: true })

        if (gitError) {
          console.error('Git error:', gitError)
          setError('Failed to fetch git history')
          setLoading(false)
          return
        }

        setOutput(result.stdout)
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [maxCount])

  if (loading) {
    return (
      <Box>
        <Text dimColor>Loading git history...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
  }

  if (!output.trim()) {
    return (
      <Box>
        <Text color="yellow">No git history found.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {output.split('\n').map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </Box>
  )
}

export const renderHistViewer = (maxCount?: number) => {
  const { waitUntilExit } = render(<HistViewer maxCount={maxCount} />)
  return waitUntilExit()
}
