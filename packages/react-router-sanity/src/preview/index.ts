/**
 * Preview state for components. Tiny: safe for every production page.
 *
 * @packageDocumentation
 */
import {useRouteLoaderData, type RouterContextProvider} from 'react-router'

import {sanityContext} from '../context'
import {DISABLED_PREVIEW, readRootData} from '../root-data'
import type {PreviewState, SanityRootData} from '../types'

/**
 * Returns the preview state of the page.
 *
 * The hook reads `sanity` from the root loader data. In an error boundary, the root data can be
 * missing. The hook then returns a disabled state.
 *
 * @returns The preview state.
 * @example
 * ```tsx
 * const preview = usePreview()
 * return <VisualEditing enabled={preview.enabled} />
 * ```
 * @public
 */
export function usePreview(): PreviewState {
  return readRootData(useRouteLoaderData('root'))?.preview ?? DISABLED_PREVIEW
}

/**
 * Returns the Sanity root data, or `undefined` when the root loader did not return it.
 *
 * @returns The serializable Sanity config and preview state.
 * @public
 */
export function useSanityRootData(): SanityRootData | undefined {
  return readRootData(useRouteLoaderData('root'))
}

/**
 * Returns the preview state from the router context. Use it in server components, loaders and
 * middleware, where hooks do not work.
 *
 * @param context - The router context.
 * @returns The preview state.
 * @public
 */
export function getPreview(context: Readonly<RouterContextProvider>): PreviewState {
  return context.get(sanityContext).preview
}
