import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  dist: 'dist',
  tsconfig: 'tsconfig.dist.json',
  minify: false,

  strictOptions: {
    // Keep typesVersions for backwards compatibility with TypeScript < 4.7 to align with Hydrogen
    // Modern TypeScript uses exports field, older versions fall back to typesVersions
    noPackageJsonTypesVersions: 'off',

    // `@sanity/client` has to stay a peer dependency. The consumer configures the client and
    // passes it to `createSanityContext`, and `@sanity/react-loader` resolves stega and live
    // mode against that same instance. Moving it to `dependencies` would allow a second copy
    // to be installed, which silently breaks stega encoding and loader identity.
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
