import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'

import { useRawMode } from '../hooks'

interface RouteViewerProps {
  routes: string[]
  onSelect: (routes: string[]) => void
  onExit: () => void
}

export const RouteViewer: FC<RouteViewerProps> = ({ routes, onSelect, onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set())
  const [scrollTop, setScrollTop] = useState(0)

  const { exit } = useApp()

  // Enable raw mode for keyboard input
  useRawMode()

  const terminalHeight = process.stdout.rows || 24
  const viewHeight = Math.max(5, terminalHeight - 4)

  useEffect(() => {
    if (routes.length === 0) return

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
      const selected = Array.from(selectedRoutes)
      if (selected.length > 0) {
        onSelect(routes.filter((route) => selected.includes(route)))
        return
      }

      if (routes[selectedIndex]) onSelect([routes[selectedIndex]])
      return
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(routes.length - 1, prev + 1))
    } else if (input === ' ') {
      const route = routes[selectedIndex]
      if (!route) return
      setSelectedRoutes((prev) => {
        const next = new Set(prev)
        if (next.has(route)) next.delete(route)
        else next.add(route)
        return next
      })
    } else if (input === 'a') {
      setSelectedRoutes((prev) => {
        if (prev.size === routes.length) return new Set()
        return new Set(routes)
      })
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
        {visibleRoutes.map((route, visibleIndex) => {
          const actualIndex = scrollTop + visibleIndex
          const isSelected = actualIndex === selectedIndex
          const isChecked = selectedRoutes.has(route)

          return (
            <Box backgroundColor={isSelected ? 'gray' : undefined} key={route}>
              <Text color={isSelected ? 'white' : 'yellow'}>{isSelected ? '>' : ' '} </Text>
              <Text color={isChecked ? 'green' : 'gray'}>{isChecked ? '[x]' : '[ ]'} </Text>
              <Text color={isSelected ? 'white' : 'green'}>{route}</Text>
            </Box>
          )
        })}
      </Box>

      <Box borderBottom={false} borderColor="gray" borderLeft={false} borderRight={false} borderStyle="single">
        <Text dimColor> ↑↓/jk: Navigate | Space: Toggle | a: All | Enter: Confirm | q: Quit</Text>
      </Box>
    </Box>
  )
}

export const renderRouteViewer = (routes: string[]): Promise<string[] | undefined> => {
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
