import type {Plugin, ResolvedConfig} from 'vite'

/**
 * Vite plugin for optimizing Sanity integration in Hydrogen applications.
 * Configures SSR optimization, dependency bundling, and ESM resolution for Sanity packages.
 */
export function sanity(): Plugin {
  return {
    name: 'sanity',

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
  }
}
