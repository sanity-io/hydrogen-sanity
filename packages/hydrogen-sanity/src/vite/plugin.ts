import type {Plugin, ResolvedConfig} from 'vite'

/**
 * Vite plugin for optimizing Sanity integration in Hydrogen applications.
 * Configures SSR optimization, dependency bundling, and ESM resolution for Sanity packages.
 */
export function sanity(): Plugin {
  return {
    name: 'sanity',
    enforce: 'pre', // Run before other plugins to intercept @sanity/react-loader resolution

    async config() {
      return {
        envPrefix: ['SANITY_STUDIO_'],
        ssr: {
          optimizeDeps: {
            // Pre-bundle Sanity dependencies for better SSR performance
            include: ['@sanity/client'],
          },
          // Prevent externalization of Sanity dependencies to ensure proper ESM resolution
          noExternal: ['@sanity/client'],
        },
      }
    },

    configResolved(resolvedConfig: ResolvedConfig) {
      // Force ESM resolution for transitive dependencies (specifically `rxjs`) in SSR builds
      // The Hydrogen/Oxygen plugins add 'node' conditions which cause packages like rxjs
      // to resolve to their CJS versions (dist/cjs/index.js) instead of ESM versions
      // We prepend 'es2015' and filter out 'node'/'require' to force ESM resolution

      // Prepend es2015 and remove node/require to force ESM resolution in SSR
      const ssrConditions = [
        'es2015',
        ...(resolvedConfig.ssr?.resolve?.conditions || []).filter(
          (condition) => condition !== 'es2015' && condition !== 'node' && condition !== 'require',
        ),
      ]

      // Override SSR resolve conditions
      if (resolvedConfig.ssr?.resolve) {
        resolvedConfig.ssr.resolve.conditions = ssrConditions
      }

      // Handle SSR environment (modern environments API)
      if (resolvedConfig.environments?.ssr?.resolve?.conditions) {
        const envConditions = [
          'es2015',
          ...resolvedConfig.environments.ssr.resolve.conditions.filter(
            (condition) =>
              condition !== 'es2015' && condition !== 'node' && condition !== 'require',
          ),
        ]
        resolvedConfig.environments.ssr.resolve.conditions = envConditions
      }
    },

    // Surgically redirect @sanity/react-loader to its server bundle during SSR
    // The browser bundle doesn't export server-only functions like setServerClient/loadQuery
    // Without this, Hydrogen/Oxygen's 'browser' condition causes the wrong bundle to load
    async resolveId(id, importer, options) {
      if (id === '@sanity/react-loader' && options.ssr) {
        // Resolve package.json (always exported) to find the package location
        const pkgResolved = await this.resolve('@sanity/react-loader/package.json', importer, {
          ...options,
          skipSelf: true,
        })
        if (pkgResolved) {
          // Construct absolute path to the server bundle, bypassing export conditions
          const serverBundle = pkgResolved.id.replace('/package.json', '/dist/index.js')
          return {id: serverBundle}
        }
      }
      return null
    },
  }
}
