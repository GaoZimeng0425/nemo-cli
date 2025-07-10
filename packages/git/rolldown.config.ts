import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import { dependencies } from './package.json'

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  external: Object.keys(dependencies),
  output: [
    {
      dir: 'dist',
      format: 'es',
      entryFileNames: 'index.mjs',
      chunkFileNames: '[name]-[hash].mjs',
      sourcemap: false,
    },
  ],
  plugins: [dts({ emitDtsOnly: true })],
})
