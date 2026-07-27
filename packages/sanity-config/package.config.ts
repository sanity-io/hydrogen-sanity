import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,

  // This package is private and only ever consumed by the Studio in `examples/studio`, so the
  // checks below guard concerns that only apply to a published artifact
  strictOptions: {
    // There is no published artifact for `publishConfig.exports` to protect
    noPublishConfigExports: 'off',

    // Browser targets are irrelevant to a Studio config that is bundled by its consumer
    noImplicitBrowsersList: 'off',
  },

  babel: {
    // `styled-components` is used by two Studio input components. The babel plugin only improves
    // debug output and SSR class names, neither of which apply here
    styledComponents: false,
  },

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
