import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['source/infra/interfaces/cli/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: false,
  clean: true,
  minify: true,
  target: 'node20',
  outDir: 'dist',
  treeshake: false,
  unbundle: false,

  deps: {
    neverBundle: ['eta', 'picocolors', 'yocto-spinner'],
  },

  copy: [
    {
      from: 'source/infra/report/templates/guardian-report.eta',
      to: 'dist/templates',
    },
    {
      from: 'source/infra/report/templates/partials/**/*',
      to: 'dist/templates/partials',
    },
  ],
})
