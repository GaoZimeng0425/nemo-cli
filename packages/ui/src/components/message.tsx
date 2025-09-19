import type { ComponentProps } from 'react'
import { Box, render, Text } from 'ink'
import Gradient from 'ink-gradient'

const MessageVariant = {
  success: { name: 'cristal' },
  error: { colors: ['#dc2626', '#7e22ce'] },
  warning: { name: 'fruit' },
  info: { name: 'vice' },
} satisfies Record<string, Omit<ComponentProps<typeof Gradient>, 'children'>>

type MessageProps = {
  text: string
  type?: keyof typeof MessageVariant
} & Omit<ComponentProps<typeof Gradient>, 'children'> &
  ComponentProps<typeof Box>

export const Message = ({ text, colors, name, type = 'success', ...props }: MessageProps) => {
  const variant = MessageVariant[type]
  return render(
    <Box width="60%">
      <Box borderColor="gray" borderStyle="round" flexGrow={0} paddingX={1} {...props}>
        <Gradient colors={colors} name={name} {...variant}>
          <Text bold>{text}</Text>
        </Gradient>
      </Box>
    </Box>
  )
}

export const ErrorMessage = ({ text, colors, ...props }: MessageProps) => {
  return render(
    <Box width="60%">
      <Box borderColor="#dc2626" borderStyle="round" flexGrow={0} paddingX={1} {...props}>
        <Gradient {...MessageVariant.error}>{text}</Gradient>
      </Box>
    </Box>
  )
}
