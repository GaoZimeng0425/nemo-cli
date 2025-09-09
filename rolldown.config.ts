import { merge } from 'es-toolkit'
import { defineConfig, type RolldownOptions } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export const config: RolldownOptions = {
  input: './src/index.ts',
  platform: 'node',
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

export const mergeConfig = (inputConfig: RolldownOptions) => {
  return defineConfig(merge(config, inputConfig))
}
