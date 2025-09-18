// import {nodeResolve} from '@rollup/plugin-node-resolve'
import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,

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
    rules: {
      'ae-incompatible-release-tags': 'off',
      'ae-internal-missing-underscore': 'off',
      'ae-missing-release-tag': 'off',
    },
  },
})
