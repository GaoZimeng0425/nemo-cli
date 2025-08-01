import type { FC } from 'react'
import { Box, render, Text } from 'ink'

import type { PromptOptions } from '../utils/prompts'

interface ListProps<T extends string | number | boolean | symbol = string> {
  items: PromptOptions<T>[]
}

export const List: FC<ListProps> = ({ items }) => {
  return (
    <Box borderColor="blue" borderStyle="single" flexDirection="column" marginBottom={1} marginTop={1}>
      {items.map((item, index) => (
        <Box key={item.value} marginBottom={index < items.length - 1 ? 1 : 0}>
          <Text color="blue">•</Text>
          <Text>{item.label}</Text>
        </Box>
      ))}
    </Box>
  )
}

export const renderList = (items: ListProps['items']) => render(<List items={items} />)
