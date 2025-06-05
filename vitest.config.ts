import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/*/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/**/src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [...configDefaults.exclude],
  },
})
