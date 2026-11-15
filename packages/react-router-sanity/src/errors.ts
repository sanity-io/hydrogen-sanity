/**
 * Lists the stable error codes of `react-router-sanity`.
 *
 * Each code links to a docs page at `docs/errors/<code>.md` in the installed package.
 *
 * @public
 */
export type SanityErrorCode =
  /** A server-only entry was imported in browser code. */
  | 'RRS001'
  /** A loader called `context.get(sanityContext)`, but the Sanity middleware is not registered. */
  | 'RRS010'
  /** The middleware config has no `client`. */
  | 'RRS011'
  /** A preview feature needs `serverToken`, but the config has no token. */
  | 'RRS020'
  /** A preview feature needs `preview.sessionSecrets` or `preview.session`, but the config has neither. */
  | 'RRS021'
  /** The perspective value is not a valid Sanity perspective. */
  | 'RRS022'
  /** The live invalidation route needs `live.secret`, but the config has no secret. */
  | 'RRS030'

const messages: Record<SanityErrorCode, string> = {
  RRS001:
    'A server-only entry of react-router-sanity was imported in browser code. Move the import to a `.server.ts` module, a loader, an action or a middleware.',
  RRS010:
    'The Sanity middleware is not registered. Add `export const middleware = [sanityMiddleware]` to `app/root.tsx`. On React Router 7, also set `future.v8_middleware: true`.',
  RRS011:
    'The Sanity middleware config has no `client`. Return `{client: createClient({...})}` from the `createSanityMiddleware` callback.',
  RRS020:
    'This preview feature needs a server token. Set `serverToken` in the `createSanityMiddleware` config. Use a token with the Viewer role.',
  RRS021:
    'This preview feature needs a session. Set `preview.sessionSecrets` (or `preview.session`) in the `createSanityMiddleware` config.',
  RRS022:
    'The perspective is not valid. Use `published`, `drafts`, or an array of release IDs.',
  RRS030:
    'The live invalidation route needs a shared secret. Set `live.secret` in the `createSanityMiddleware` config.',
}

/**
 * Describes an error that `react-router-sanity` throws.
 *
 * The `code` property is stable across versions. The message states the cause and the fix.
 *
 * @public
 */
export class SanityRouterError extends Error {
  /** Identifies the error. See `docs/errors/<code>.md` in the installed package. */
  readonly code: SanityErrorCode

  /**
   * Creates an error for a known error code.
   *
   * @param code - The stable error code.
   * @param detail - Extra detail to append to the message.
   */
  constructor(code: SanityErrorCode, detail?: string) {
    super(`[${code}] ${messages[code]}${detail ? ` ${detail}` : ''}`)
    this.name = 'SanityRouterError'
    this.code = code
  }
}
