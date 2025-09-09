import { type ComponentTheme, defaultTheme, extendTheme, ThemeProvider } from '@inkjs/ui'
import type { TextProps } from 'ink'

const ProgressBar = {
  styles: {
    completed: (): TextProps => ({
      color: 'green',
    }),
    remaining: (): TextProps => ({
      backgroundColor: '#fff',
    }),
  },
} satisfies ComponentTheme
export type ProgressBarTheme = typeof ProgressBar

const Spinner = {
  styles: {
    frame: (): TextProps => ({
      color: '#fff',
    }),
  },
} satisfies ComponentTheme
export type SpinnerTheme = typeof Spinner

const customTheme = extendTheme(defaultTheme, {
  components: {
    ProgressBar,
    Spinner,
  },
})

const Provider = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider theme={customTheme}>{children}</ThemeProvider>
}

export default Provider
