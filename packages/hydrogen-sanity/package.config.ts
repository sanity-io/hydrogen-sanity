// import {nodeResolve} from '@rollup/plugin-node-resolve'
import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,

  // Keep typesVersions for backwards compatibility with TypeScript < 4.7 to align with Hydrogen
  // Modern TypeScript uses exports field, older versions fall back to typesVersions
  strictOptions: {
    noPackageJsonTypesVersions: 'off',
  },

  // rollup: {
  //   output: {
  //     format: 'es',
  //   },
  //   plugins(prev) {
  //     return prev.map((plugin) => {
  //       if (plugin.name === 'node-resolve') {
  //         return nodeResolve({
  //           browser: true,
  //           modulesOnly: true,
  //           extensions: ['.cjs', '.mjs', '.js', '.jsx', '.json', '.node'],
  //           preferBuiltins: true,
  //           // RXJS
  //           exportConditions: ['es2015'],
  //         })
  //       }

  //       return plugin
  //     })
  //   },
  // },

  // external: ['rxjs'],

  // Remove this block to enable strict export validation
  extract: {
    // Disable type checking during dts generation for faster builds
    // (type checking is done separately via `tsc`)
    checkTypes: false,
    rules: {
      'ae-incompatible-release-tags': 'off',
      'ae-internal-missing-underscore': 'off',
      'ae-missing-release-tag': 'off',
    },
  },
})
