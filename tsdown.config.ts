import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['source/infra/interfaces/cli/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node20',
  outDir: 'dist',
  treeshake: false,
  unbundle: true,

  deps: {
    neverBundle: ['eta', 'picocolors', 'yocto-spinner'],
  },

  copy: [
    {
      from: 'source/infra/report/templates/guardian-report.eta',
      to: 'dist/infra/report/templates',
    },
    {
      from: 'source/infra/report/templates/partials/**/*',
      to: 'dist/infra/report/templates/partials',
    },
  ],
})
