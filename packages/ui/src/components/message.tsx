import type { ComponentProps } from 'react'
import { Box, render, Text } from 'ink'
import Gradient from 'ink-gradient'

type MessageProps = {
  text: string
} & Omit<ComponentProps<typeof Gradient>, 'children'> &
  ComponentProps<typeof Box>

export const Message = ({ text, colors, name = 'passion', ...props }: MessageProps) => {
  return render(
    <Box width="60%">
      <Box borderColor="gray" borderStyle="round" flexGrow={0} paddingX={1} {...props}>
        <Gradient colors={colors} name={name}>
          <Text>{text}</Text>
        </Gradient>
      </Box>
    </Box>
  )
}

export const ErrorMessage = ({ text, colors, ...props }: MessageProps) => {
  return render(
    <Box width="60%">
      <Box borderColor="#dc2626" borderStyle="round" flexGrow={0} paddingX={1} {...props}>
        <Gradient colors={['#dc2626', '#7e22ce']}>{text}</Gradient>
      </Box>
    </Box>
  )
}
