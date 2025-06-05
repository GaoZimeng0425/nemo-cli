import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  rollup: {
    inlineDependencies: true,
    emitCJS: false,
    esbuild: {
      target: 'node20',
    },
    json: {
      compact: true,
      namedExports: false,
      preferConst: false,
    },
    commonjs: {
      requireReturnsDefault: 'auto',
    },
    dts: {
      respectExternal: true,
    },
  },
  clean: true,
  declaration: 'compatible',
})
