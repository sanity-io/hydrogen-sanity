/**
 * The live invalidation resource route. The Sync Tag Invalidate Function calls it. Server only.
 *
 * @example
 * ```ts
 * // app/routes/api.sanity.invalidate.ts
 * export {action} from 'react-router-sanity/live/route'
 * ```
 * @packageDocumentation
 */
import type {RouterContextProvider} from 'react-router'

import {SanityRouterError} from '../errors'
import {getInternal} from '../server/internal'
import {SIGNATURE_HEADER, verifyInvalidation} from './signature'

/**
 * Gives the arguments of the live route action.
 *
 * @public
 */
export interface LiveRouteArgs {
  /** Gives the request. */
  request: Request
  /** Gives the router context. The Sanity middleware sets the Sanity values on it. */
  context: Readonly<RouterContextProvider>
}

const NO_STORE = {'Cache-Control': 'private, no-store'}

function readTags(body: string): string[] | undefined {
  try {
    const value: unknown = JSON.parse(body)
    if (typeof value !== 'object' || value === null || !('tags' in value)) return undefined
    const {tags} = value
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) return undefined
    return tags
  } catch {
    return undefined
  }
}

/**
 * Purges the app cache for a set of sync tags.
 *
 * The action accepts only a `POST` with a valid HMAC signature in the
 * `X-Sanity-Invalidate-Signature` header. The signature includes a timestamp, so the action
 * rejects replayed calls after 5 minutes. After the purge, the action calls `live.onInvalidate`
 * for CDN purges.
 *
 * @param args - The request and the router context.
 * @returns JSON with the number of purged tags, or 400, 401 or 405.
 * @throws RRS030 when the config has no `live.secret`.
 * @public
 */
export async function action({request, context}: LiveRouteArgs): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, {status: 405, headers: NO_STORE})
  const {config} = getInternal(context)
  const secret = config.live?.secret
  if (!secret) throw new SanityRouterError('RRS030')

  const body = await request.text()
  if (!(await verifyInvalidation(secret, body, request.headers.get(SIGNATURE_HEADER)))) {
    return new Response(null, {status: 401, headers: NO_STORE})
  }
  const tags = readTags(body)
  if (!tags) return Response.json({error: 'Expected {"tags": string[]}'}, {status: 400, headers: NO_STORE})

  await config.cache?.store.invalidateTags?.(tags)
  await config.live?.onInvalidate?.(tags)
  return Response.json({invalidated: tags.length}, {headers: NO_STORE})
}

export {signInvalidation} from './signature'
