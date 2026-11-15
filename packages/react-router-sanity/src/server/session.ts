import {validateApiPerspective, type ClientPerspective} from '@sanity/client'
import {createCookieSessionStorage, type SessionStorage} from 'react-router'

/**
 * Defines the port between the SDK and a session store.
 *
 * The default store is a signed cookie. A Hydrogen app can pass its own session, because the
 * Hydrogen session has the same four methods.
 *
 * @public
 */
export interface PreviewSession {
  /** Returns the value for a key. */
  get(key: string): unknown
  /** Sets the value for a key. */
  set(key: string, value: unknown): void
  /** Removes a key. */
  unset(key: string): void
  /** Returns the `Set-Cookie` header values that store the session. */
  commit(): Promise<string | string[]>
}

/**
 * Creates a preview session for one request.
 *
 * @public
 */
export type PreviewSessionFactory = (request: Request) => Promise<PreviewSession>

/**
 * Sets the options of `cookiePreviewSession`.
 *
 * @public
 */
export interface CookiePreviewSessionOptions {
  /** Gives the secrets that sign the cookie. Put the newest secret first to rotate secrets. */
  secrets: string[]
  /**
   * Sets the cookie name. Change it when two apps share a domain.
   *
   * @defaultValue `'__sanity_preview'`
   */
  cookieName?: string
}

/** The session key that holds the preview data. */
export const PREVIEW_SESSION_KEY = 'sanity-preview'

/**
 * Describes the preview data in the session.
 *
 * @internal
 */
export interface PreviewSessionData {
  projectId: string
  dataset: string
  perspective: ClientPerspective
  variant?: string
}

/** Matches a perspective name or a release name. */
const PERSPECTIVE_NAME = /^[A-Za-z0-9][\w.-]{0,127}$/

/**
 * Tells if a value is a valid perspective: a name, or a non-empty array of names.
 *
 * `validateApiPerspective` from `@sanity/client` only rejects `raw` in an array. It accepts any
 * other value, so the SDK checks the shape first. Preview input comes from a cookie or a form.
 *
 * @internal
 */
export function isPerspective(value: unknown): value is ClientPerspective {
  const names = Array.isArray(value) ? value : [value]
  if (names.length === 0 || names.length > 32) return false
  if (!names.every((name) => typeof name === 'string' && PERSPECTIVE_NAME.test(name))) return false
  try {
    validateApiPerspective(value)
    return true
  } catch {
    return false
  }
}

/**
 * Tells if a value is valid preview session data.
 *
 * @internal
 */
export function isPreviewSessionData(value: unknown): value is PreviewSessionData {
  if (typeof value !== 'object' || value === null) return false
  if (!('projectId' in value) || !('dataset' in value) || !('perspective' in value)) return false
  if (typeof value.projectId !== 'string' || typeof value.dataset !== 'string') return false
  if (!isPerspective(value.perspective)) return false
  return !('variant' in value) || value.variant === undefined || typeof value.variant === 'string'
}

function isCrossSiteIframe(request: Request): boolean {
  return (
    request.headers.get('sec-fetch-dest') === 'iframe' &&
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
}

function hasCookie(request: Request, name: string): boolean {
  const header = request.headers.get('Cookie') ?? ''
  return header.split(';').some((part) => part.trim().startsWith(`${name}=`))
}

type CookieMode = 'local' | 'partitioned' | 'cross-site'

/**
 * Creates the default preview session: a signed, `HttpOnly` cookie.
 *
 * The cookie uses `Secure` and `SameSite=None`, so it works in the Presentation iframe. When the
 * request comes from a cross-site iframe, the cookie also uses `Partitioned` (CHIPS), so it works
 * when the browser blocks third-party cookies. A companion flag cookie keeps later writes in the
 * same partition. On `http:` origins (local development) the cookie uses `SameSite=Lax` and no
 * `Secure` flag.
 *
 * @param options - The signing secrets and the cookie name.
 * @returns A session factory for the `preview.session` option.
 * @public
 */
export function cookiePreviewSession(options: CookiePreviewSessionOptions): PreviewSessionFactory {
  const name = options.cookieName ?? '__sanity_preview'
  const flagName = `${name}_partitioned`
  const storages = new Map<CookieMode, SessionStorage>()

  function storageFor(mode: CookieMode): SessionStorage {
    const existing = storages.get(mode)
    if (existing) return existing
    const storage = createCookieSessionStorage({
      cookie: {
        name,
        path: '/',
        httpOnly: true,
        secrets: options.secrets,
        secure: mode !== 'local',
        sameSite: mode === 'local' ? 'lax' : 'none',
        partitioned: mode === 'partitioned',
      },
    })
    storages.set(mode, storage)
    return storage
  }

  return async (request) => {
    const local = new URL(request.url).protocol === 'http:'
    const partitioned = !local && (isCrossSiteIframe(request) || hasCookie(request, flagName))
    const mode: CookieMode = local ? 'local' : partitioned ? 'partitioned' : 'cross-site'
    const storage = storageFor(mode)
    const session = await storage.getSession(request.headers.get('Cookie'))

    return {
      get: (key) => session.get(key),
      set: (key, value) => session.set(key, value),
      unset: (key) => session.unset(key),
      async commit() {
        const empty = Object.keys(session.data).length === 0
        const cookie = empty
          ? await storage.destroySession(session)
          : await storage.commitSession(session)
        if (mode !== 'partitioned') return cookie
        const flag = empty
          ? `${flagName}=; Path=/; Max-Age=0; Secure; SameSite=None; Partitioned; HttpOnly`
          : `${flagName}=1; Path=/; Secure; SameSite=None; Partitioned; HttpOnly`
        return [cookie, flag]
      },
    }
  }
}
