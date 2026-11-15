import {createContext} from 'react-router'

import {SanityRouterError} from './errors'
import type {SanityRequestContext} from './types'

function unregistered(): never {
  throw new SanityRouterError('RRS010')
}

/**
 * The default value of `sanityContext`. Every member throws RRS010, so a missing middleware fails
 * with an instruction and not with `undefined`.
 */
const unregisteredContext: SanityRequestContext = {
  get client(): never {
    return unregistered()
  },
  get preview(): never {
    return unregistered()
  },
  fetch: unregistered,
  syncTags: unregistered,
  getRootData: unregistered,
}

/**
 * Identifies the Sanity request context in the React Router context.
 *
 * The Sanity middleware sets the value for each request. Read it in loaders, actions and
 * middleware with `context.get(sanityContext)`.
 *
 * @example
 * ```ts
 * export async function loader({context, params}: Route.LoaderArgs) {
 *   const {data, syncTags} = await context.get(sanityContext).fetch({query: PAGE_QUERY, params})
 *   return {page: data, syncTags}
 * }
 * ```
 * @public
 */
export const sanityContext = createContext<SanityRequestContext>(unregisteredContext)
