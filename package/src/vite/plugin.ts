import type {createContentSecurityPolicy} from '@shopify/hydrogen'
import {mergeConfig, type Plugin, transformWithEsbuild} from 'vite'

import * as VirtualModule from './vmod'

type ContentSecurityPolicy = Parameters<typeof createContentSecurityPolicy>[0]

type SanityPluginOptions = {
  sanityConfigPath?: string | null | undefined

  contentSecurityPolicy?:
    | ContentSecurityPolicy
    | ((
        env: Record<string, string | undefined>,
        mode: string,
      ) => ContentSecurityPolicy | null | undefined | void)
    | null
    | undefined
}

const studioConfigId = VirtualModule.id('config')
const cspId = VirtualModule.id('csp')
const routeClientId = VirtualModule.id('route-client')

export function sanity(options?: SanityPluginOptions | undefined | null): Plugin[] {
  let contentSecurityPolicy: ContentSecurityPolicy = {}
  let mode: string

  return [
    {
      name: 'sanity:config',

      config(config) {
        return mergeConfig(config, {
          envPrefix: ['SANITY_STUDIO_'],
        })
      },

      resolveId(id) {
        if (id === studioConfigId) {
          return VirtualModule.resolve(id)
        }

        return null
      },

      async load(id: string) {
        if (id === VirtualModule.resolve(studioConfigId)) {
          const resolvedStudioConfig = await this.resolve('/sanity.config')
          if (!resolvedStudioConfig) {
            throw new Error(
              '[hydrogen-sanity]: Sanity Studio requires a `sanity.config.{ts,js}` file in your project root.',
            )
          }

          return await transformWithEsbuild(
            `
export {default} from "${resolvedStudioConfig.id}";
        `,
            id,
            {
              loader: 'js',
            },
          )
        }

        return null
      },
    },
    {
      name: 'sanity:studio',

      configResolved(config) {
        mode = config.mode

        contentSecurityPolicy =
          // eslint-disable-next-line no-nested-ternary
          options && options.contentSecurityPolicy
            ? typeof options.contentSecurityPolicy === 'function'
              ? options.contentSecurityPolicy(config.env, config.mode) || {}
              : options.contentSecurityPolicy || {}
            : {}
      },

      /**
       * Resolve virtual module IDs to their internal form.
       * This is called when Vite encounters an import of our virtual modules.
       */
      resolveId(id) {
        if (id === cspId || id === routeClientId) {
          return VirtualModule.resolve(id)
        }

        return null
      },

      /**
       * Load the content of virtual modules.
       * This is called after resolveId to get the actual module content.
       */
      async load(id: string) {
        if (id === VirtualModule.resolve(routeClientId)) {
          const moduleId = 'hydrogen-sanity/studio/route-client'
          return {
            code:
              mode === 'production'
                ? `export {default} from '${moduleId}?url';`
                : `export default '/@id/${moduleId}';`,
            moduleSideEffects: false,
          }
        }

        if (id === VirtualModule.resolve(cspId)) {
          return {
            code: `export const contentSecurityPolicy = ${JSON.stringify(contentSecurityPolicy)}`,
            moduleSideEffects: false,
          }
        }

        return null
      },
    },
  ]
}
