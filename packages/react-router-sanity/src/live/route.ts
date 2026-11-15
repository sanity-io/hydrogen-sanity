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

/** Limits the body size. A sync tag list of 1,000 tags fits in well under 64 KB. */
const MAX_BODY_BYTES = 64 * 1024

/**
 * Purges the app cache for a set of sync tags.
 *
 * The action accepts only a `POST` with a valid HMAC signature in the
 * `X-Sanity-Invalidate-Signature` header. The signature includes a timestamp. The action rejects a
 * signature older or newer than 5 minutes. Inside that window, an attacker can send a captured
 * call again. A purge is idempotent, so a replay only purges again. After the purge, the action calls
 * `live.onInvalidate` for CDN purges.
 *
 * @param args - The request and the router context.
 * @returns JSON with the tag count and whether the store purged, or 400, 401, 405 or 413.
 * @throws RRS030 when the config has no `live.secret`.
 * @public
 */
export async function action({request, context}: LiveRouteArgs): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, {status: 405, headers: NO_STORE})
  const {config} = getInternal(context)
  const secret = config.live?.secret
  if (!secret) throw new SanityRouterError('RRS030')

  const declared = Number(request.headers.get('Content-Length') ?? 0)
  if (declared > MAX_BODY_BYTES) return new Response(null, {status: 413, headers: NO_STORE})
  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return new Response(null, {status: 413, headers: NO_STORE})
  }
  if (!(await verifyInvalidation(secret, body, request.headers.get(SIGNATURE_HEADER)))) {
    return new Response(null, {status: 401, headers: NO_STORE})
  }
  const tags = readTags(body)
  if (!tags) return Response.json({error: 'Expected {"tags": string[]}'}, {status: 400, headers: NO_STORE})

  const store = config.cache?.store
  await store?.invalidateTags?.(tags)
  await config.live?.onInvalidate?.(tags)
  return Response.json({tags: tags.length, purged: Boolean(store?.invalidateTags)}, {headers: NO_STORE})
}

export {signInvalidation} from './signature'
