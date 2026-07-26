import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,

  strictOptions: {
    // Keep typesVersions for backwards compatibility with TypeScript < 4.7 to align with Hydrogen
    // Modern TypeScript uses exports field, older versions fall back to typesVersions
    noPackageJsonTypesVersions: 'off',

    // @sanity/client is a real peer dependency (consumers bring their own client
    // instance)
    noSanityClientPeerDependency: 'off',
  },

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
