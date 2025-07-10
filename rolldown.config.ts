import type { RolldownOptions } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import { dependencies } from './packages/shared/package.json'

export const config: RolldownOptions = {
  input: './src/index.ts',
  platform: 'node',
  external: Object.keys(dependencies),
  output: [
    {
      dir: 'dist',
      format: 'esm',
      sourcemap: false,
    },
  ],
  plugins: [
    dts({
      tsconfig: './tsconfig.build.json',
    }),
  ],
}
