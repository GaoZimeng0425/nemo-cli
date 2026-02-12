import { useEffect } from 'react'
import { useApp } from 'ink'

/**
 * Hook to manage stdin raw mode for interactive terminal components.
 *
 * Raw mode is required for proper keyboard input handling (like j/k navigation).
 * This hook automatically enables raw mode when mounted and restores normal mode on unmount.
 *
 * @example
 * ```tsx
 * export const MyComponent: FC = () => {
 *   useRawMode() // Enable raw mode
 *
 *   useInput((input, key) => {
 *     if (input === 'q') {
 *       exit()
 *     }
 *   })
 *
 *   return <Box>...</Box>
 * }
 * ```
 */
const useRawMode = () => {
  const app = useApp()
  const stdin = (app as { stdin?: { setRawMode: (mode: boolean) => void } }).stdin

  useEffect(() => {
    if (stdin && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(true)
      return () => {
        stdin.setRawMode(false)
      }
    }
  }, [stdin])
}

export { useRawMode }
