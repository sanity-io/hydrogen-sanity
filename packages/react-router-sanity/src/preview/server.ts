/**
 * The `react-server` variant of `react-router-sanity/preview`. Server components cannot use hooks,
 * so the hooks throw an instruction.
 */
import type {RouterContextProvider} from 'react-router'

import {sanityContext} from '../context'
import type {PreviewState, SanityRootData} from '../types'

function noHooks(name: string): never {
  throw new Error(
    `${name}() does not work in a server component. Use getPreview(context) in the server component, or call ${name}() in a client component.`,
  )
}

/** See `react-router-sanity/preview`. Throws in server components. */
export function usePreview(): PreviewState {
  return noHooks('usePreview')
}

/** See `react-router-sanity/preview`. Throws in server components. */
export function useSanityRootData(): SanityRootData | undefined {
  return noHooks('useSanityRootData')
}

/** Returns the preview state from the router context. */
export function getPreview(context: Readonly<RouterContextProvider>): PreviewState {
  return context.get(sanityContext).preview
}
