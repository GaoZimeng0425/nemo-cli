import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

interface RouteViewerProps {
  routes: string[]
  onSelect: (route: string) => void
  onExit: () => void
}

export const RouteViewer: FC<RouteViewerProps> = ({ routes, onSelect, onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const { exit } = useApp()

  const terminalHeight = process.stdout.rows || 24
  const viewHeight = Math.max(5, terminalHeight - 4)

  useEffect(() => {
    if (routes.length === 0) return

    const halfView = Math.floor(viewHeight / 2)
    if (selectedIndex < scrollTop + 2) {
      setScrollTop(Math.max(0, selectedIndex - 2))
    } else if (selectedIndex > scrollTop + viewHeight - 3) {
      setScrollTop(Math.min(routes.length - viewHeight, selectedIndex - viewHeight + 3))
    }
  }, [selectedIndex, routes.length, viewHeight, scrollTop])

  const visibleRoutes = useMemo(() => {
    if (routes.length === 0) return []
    return routes.slice(scrollTop, scrollTop + viewHeight)
  }, [routes, scrollTop, viewHeight])

  useInput((input, key) => {
    if (input === 'q') {
      onExit()
      exit()
      return
    }

    if (routes.length === 0) return

    if (key.return) {
      if (routes[selectedIndex]) {
        onSelect(routes[selectedIndex])
      }
      return
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(routes.length - 1, prev + 1))
    }
  })

  if (routes.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color="yellow">No routes found.</Text>
      </Box>
    )
  }

  return (
    <Box borderStyle="single" flexDirection="column" width="100%">
      <Box paddingX={1}>
        <Text bold color="cyan">
          Select Page Route ({routes.length})
        </Text>
      </Box>

      <Box flexDirection="column" height={viewHeight} paddingX={1}>
        {visibleRoutes.map((route) => {
          const actualIndex = routes.indexOf(route)
          const isSelected = actualIndex === selectedIndex

          return (
            <Box backgroundColor={isSelected ? 'gray' : undefined} key={route}>
              <Text color={isSelected ? 'white' : 'yellow'}>{isSelected ? '>' : ' '} </Text>
              <Text color={isSelected ? 'white' : 'green'}>{route}</Text>
            </Box>
          )
        })}
      </Box>

      <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
        <Text dimColor> ↑↓/jk: Navigate | Enter: Select | q: Quit</Text>
      </Box>
    </Box>
  )
}

export const renderRouteViewer = (routes: string[]): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const { unmount } = render(
      <RouteViewer
        onExit={() => {
          unmount()
          resolve(undefined)
        }}
        onSelect={(route) => {
          unmount()
          resolve(route)
        }}
        routes={routes}
      />
    )
  })
}
