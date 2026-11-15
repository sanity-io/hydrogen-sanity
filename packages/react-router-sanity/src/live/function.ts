/**
 * Helpers for the Sync Tag Invalidate Function. No dependencies: safe for the Sanity Functions
 * runtime.
 *
 * @packageDocumentation
 */
import {SIGNATURE_HEADER, signInvalidation} from './signature'

export {signInvalidation} from './signature'

/**
 * Sets the options of `notifyApp`.
 *
 * @public
 */
export interface NotifyAppOptions {
  /** Gives the full URL of the live route, for example `https://example.com/api/sanity/invalidate`. */
  url: string
  /** Gives the shared secret. It must match `live.secret` in the middleware config. */
  secret: string
  /** Gives the sync tags to purge. */
  tags: string[]
}

/**
 * Sends a signed invalidation call to the app.
 *
 * Call it in the Sync Tag Invalidate Function before `done(syncTags)`. Then the app purges its
 * cache before `<SanityLive>` receives the event.
 *
 * @param options - The route URL, the secret and the tags.
 * @returns The response of the app.
 * @throws an `Error` when the app does not return a 2xx status.
 * @example
 * ```ts
 * export const handler = documentEventHandler(async ({event, context}) => {
 *   await notifyApp({url: APP_URL, secret: process.env.SANITY_LIVE_SECRET, tags: event.data.syncTags})
 *   await context.done(event.data.syncTags)
 * })
 * ```
 * @public
 */
export async function notifyApp(options: NotifyAppOptions): Promise<Response> {
  const body = JSON.stringify({tags: options.tags})
  const response = await fetch(options.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [SIGNATURE_HEADER]: await signInvalidation(options.secret, body),
    },
    body,
  })
  if (!response.ok) throw new Error(`The app rejected the invalidation call: ${response.status}`)
  return response
}
