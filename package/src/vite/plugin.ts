import type {Preset} from '@remix-run/dev'
import type {Plugin} from 'vite'

import * as VirtualModule from './vmod'

type SanityPluginOptions = {
  /**
   * The route where you'd like the embedded Studio to be served from.
   * @example '/admin'
   */
  studioBasePath?: string
}

const sharedOptions: SanityPluginOptions = {
  studioBasePath: '/studio',
}

const sanityConfig = VirtualModule.id('config')
const studioRoute = VirtualModule.id('studio')
const vmods = [sanityConfig, studioRoute]

export function sanity(options?: SanityPluginOptions): Plugin {
  if (options?.studioBasePath) {
    sharedOptions.studioBasePath = options.studioBasePath
  }

  return {
    name: 'sanity',

    resolveId(id) {
      if (vmods.includes(id)) {
        return VirtualModule.resolve(id)
      }

      return null
    },

    async load(id: string) {
      switch (id) {
        case VirtualModule.resolve(studioRoute): {
          const studioRoot = new URL('../src/studio/root.tsx', import.meta.url).pathname
          return `export * from "${studioRoot}"`
        }

        case VirtualModule.resolve(sanityConfig): {
          const studioConfig = await this.resolve('/sanity.config')

          if (!studioConfig) {
            throw new Error(
              '[hydrogen-sanity]: Sanity Studio requires a `sanity.config.ts|js` file in your project root.',
            )
          }

          return `
import studioConfig from "${studioConfig.id}";

if (studioConfig.basePath) {
  if (studioConfig.basePath !== "${sharedOptions.studioBasePath}") {
    console.warn(
      "[hydrogen-sanity]: This integration ignores the basePath setting in sanity.config.ts|js. To set the basePath for Sanity Studio, use the studioBasePath option in vite.config.ts and remove it from sanity.config.ts.");
  }
}

export const config = {
  ...studioConfig,
  // override basePath from sanity.config.ts|js with plugin setting
  basePath: "${sharedOptions.studioBasePath}",
}
        `
        }

        default:
          return null
      }
    },
  }
}

sanity.preset = (): Preset => {
  return {
    name: 'sanity',
    remixConfig() {
      return {
        routes: (defineRoutes) => {
          const id = 'studio-root'
          const routes = defineRoutes((route) => {
            route(`${sharedOptions.studioBasePath}/*`, VirtualModule.resolve(studioRoute), {
              id,
            })
          })

          // @ts-expect-error
          // eslint-disable-next-line no-new-wrappers
          routes[id].parentId = new String('')

          console.dir(routes, {depth: null})

          return routes
        },
      }
    },
    // remixConfigResolved({remixConfig}) {
    //   console.log(remixConfig.routes)
    // },
  }
}
