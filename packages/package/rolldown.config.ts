import { defineConfig } from 'rolldown'

import { config } from '../../rolldown.config'
import { dependencies } from './package.json'

export default defineConfig({
  ...config,
  input: './src/index.ts',
  external: Object.keys(dependencies),
})
