import { mergeWith } from 'es-toolkit'
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
  return defineConfig(
    mergeWith(config, inputConfig, (targetValue, sourceValue) => {
      // 数组拼接而不是按索引合并
      if ([targetValue, sourceValue].every(Array.isArray)) {
        return [...targetValue, ...sourceValue]
      }
    })
  )
}
