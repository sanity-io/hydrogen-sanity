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

// Define virtual module IDs that our plugin will handle
const clientEntryId = VirtualModule.id('entry.client')
const studioId = VirtualModule.id('studio')
const clientStudioId = VirtualModule.id('studio.client')
const studioConfigId = VirtualModule.id('config.client')
const cspId = VirtualModule.id('csp')

/**
 * Sanity Vite plugin that provides virtual modules for the Sanity Studio.
 * This allows importing Sanity Studio components and configuration through
 * virtual module imports.
 */
export function sanity(options?: SanityPluginOptions | undefined | null): Plugin[] {
  let contentSecurityPolicy: ContentSecurityPolicy = {}

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
        if (([clientEntryId, studioId, clientStudioId, cspId] as string[]).includes(id)) {
          return VirtualModule.resolve(id)
        }

        return null
      },

      /**
       * Load the content of virtual modules.
       * This is called after resolveId to get the actual module content.
       */
      async load(id: string) {
        if (id === VirtualModule.resolve(clientEntryId)) {
          const clientEntry = await transformWithEsbuild(
            `
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {Studio} from '${studioId}';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <Studio />
    </StrictMode>
  );
});
          `,
            id,
            {
              loader: 'jsx',
              jsx: 'automatic',
            },
          )

          return clientEntry.code
        }

        if (id == VirtualModule.resolve(clientStudioId)) {
          const clientStudio = await transformWithEsbuild(
            `
import {Studio} from 'sanity'
import config from '${studioConfigId}'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Studio should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables the Studio App on the front-end
 */
function ClientStudio() {
  return <Studio config={config} />
}

export {ClientStudio as default}
            `,
            id,
            {
              loader: 'jsx',
              jsx: 'automatic',
            },
          )

          return clientStudio.code
        }

        if (id === VirtualModule.resolve(studioId)) {
          const bridgeScriptUrl = 'https://core.sanity-cdn.com/bridge.js'

          const studio = await transformWithEsbuild(
            `
import {useNonce} from '@shopify/hydrogen'
import {lazy, Suspense} from 'react'

function StudioFallback() {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const StudioComponent =
  typeof document === 'undefined' ? StudioFallback : lazy(() => import('${clientStudioId}'))

export function Studio() {
  const nonce = useNonce()

  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="same-origin" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex" />
        <script src="${bridgeScriptUrl}" async type="module" data-sanity-core nonce={nonce} />
      </head>
      <body>
        <Suspense>
          <StudioComponent />
        </Suspense>
        <style nonce={nonce}>
          {\`
html,body {
  height: 100vh;
  max-height: 100dvh;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  overflow: auto;
  margin: unset;
}
          \`}
        </style>
      </body>
    </html>
  )
}
`,
            id,
            {
              loader: 'jsx',
              jsx: 'automatic',
            },
          )

          return studio.code
        }

        if (id === VirtualModule.resolve(cspId)) {
          const csp = await transformWithEsbuild(
            `
import {createContentSecurityPolicy} from '@shopify/hydrogen'

export const contentSecurityPolicy = ${JSON.stringify(contentSecurityPolicy)}
            `,
            id,
            {
              loader: 'js',
            },
          )

          return csp.code
        }

        return null
      },
    },
  ]
}
