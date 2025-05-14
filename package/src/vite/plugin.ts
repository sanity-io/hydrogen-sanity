import {type Plugin, transformWithEsbuild} from 'vite'

import * as VirtualModule from './vmod'

// Define virtual module IDs that our plugin will handle
const studio = VirtualModule.id('studio')
// const configRoute = VirtualModule.id('config')
// const vmods = [studio]

/**
 * Sanity Vite plugin that provides virtual modules for the Sanity Studio.
 * This allows importing Sanity Studio components and configuration through
 * virtual module imports.
 */
export function sanity(): Plugin {
  return {
    name: 'sanity',

    /**
     * Resolve virtual module IDs to their internal form.
     * This is called when Vite encounters an import of our virtual modules.
     */
    // resolveId(id: string) {
    //   // Type assertion since we know vmods contains valid virtual module IDs
    //   if (vmods.includes(id as (typeof vmods)[number])) {
    //     console.log(id)
    //     return VirtualModule.resolve(id)
    //   }

    //   return null
    // },

    /**
     * Load the content of virtual modules.
     * This is called after resolveId to get the actual module content.
     */
    async load(id: string) {
      if (id === VirtualModule.resolve(studio)) {
        const clientEntry = await transformWithEsbuild(
          `
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {Studio} from 'hydrogen-sanity/studio';

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

      return null
    },
  }
}
