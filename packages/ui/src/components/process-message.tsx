import { useCallback, useEffect, useState } from 'react'
import { ProgressBar, Spinner } from '@inkjs/ui'
import { x } from '@nemo-cli/shared'
import { Box, render, Static, Text, useApp } from 'ink'

import Provider from './provider'

type ProcessMessageProps = {
  command: string
  commandArgs?: string[]
  onSuccess?: () => void
  onError?: (error: string) => void
}

const ProcessMessageUI = ({ command, commandArgs, onSuccess, onError }: ProcessMessageProps) => {
  const [messages, setMessages] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const { exit } = useApp()
  const executeCommand = useCallback(async () => {
    try {
      const process = x(command, commandArgs)
      for await (const line of process) {
        setProgress((prev) => prev + 1)
        setMessages((prev) => [...prev, line])
      }
      onSuccess?.()
    } catch (err) {
      onError?.(err as string)
    } finally {
      exit()
    }
  }, [command, commandArgs, onError, onSuccess, exit])

  // biome-ignore lint/correctness/useExhaustiveDependencies: unMounted
  useEffect(() => {
    executeCommand()
  }, [])

  return (
    <Provider>
      <Box flexDirection="column">
        <Static items={messages}>{(message) => <Text key={message}>{message}</Text>}</Static>

        <ProgressBar value={progress} />
        <Box alignItems="center" borderStyle="round" flexDirection="row" gap={1} paddingX={1}>
          <Spinner />
          <Text color="green">
            {command} {commandArgs?.join(' ')}
          </Text>
        </Box>
      </Box>
    </Provider>
  )
}

export const ProcessMessage = ({ command, commandArgs, onSuccess, onError }: ProcessMessageProps) => {
  return render(
    <Box width="100%">
      <ProcessMessageUI command={command} commandArgs={commandArgs} onError={onError} onSuccess={onSuccess} />
    </Box>
  )
}
