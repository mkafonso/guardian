import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['source/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node20',
  outDir: 'dist',
  treeshake: true,

  // avoid bundlar deps externas
  external: ['openai', 'zod'],
})
