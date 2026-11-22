import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'
import {
  type CookieOptions,
  createCookieSessionStorage,
  type Session,
  type SessionStorage,
} from 'react-router'

interface PreviewSessionData {
  perspective: string
  /**
   * Records that this cookie was written with the CHIPS `Partitioned` attribute.
   * A partitioned cookie is only readable inside its own partition, so reading
   * this flag back is proof that the request is running in that partition.
   */
  partitioned: boolean
}

/**
 * Cookie attributes callers may override when initialising the preview session.
 * `name` and `secrets` are owned by the package and cannot be changed.
 */
export type PreviewCookieOptions = Omit<CookieOptions, 'name' | 'secrets'>

/**
 * Detects whether a request is a cross-site iframe navigation, which is how
 * Presentation loads the storefront.
 *
 * Only the request that enters preview mode carries this signal. Later writes
 * (perspective changes, disabling preview) are same-origin fetches from within
 * the iframe and are indistinguishable from top-level fetches, which is why the
 * decision is persisted in the session payload.
 */
function isCrossSiteIframe(request: Request): boolean {
  return (
    request.headers.get('sec-fetch-dest') === 'iframe' &&
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
}

/**
 * Interface for Sanity preview session management.
 */
export interface SanityPreviewSession {
  has: Session<PreviewSessionData, never>['has']
  get: Session<PreviewSessionData, never>['get']
  set: Session<PreviewSessionData, never>['set']
  unset: Session<PreviewSessionData, never>['unset']
  commit: () => ReturnType<SessionStorage<PreviewSessionData, never>['commitSession']>
  destroy: () => ReturnType<SessionStorage<PreviewSessionData, never>['destroySession']>
}

/**
 * Cookie-based session storage for Sanity preview mode.
 * Manages perspective state and authentication for preview mode.
 */
export class PreviewSession implements SanityPreviewSession {
  #sessionStorage
  #session
  #partitioned

  constructor(sessionStorage: SessionStorage, session: Session, partitioned = false) {
    this.#sessionStorage = sessionStorage
    this.#session = session
    this.#partitioned = partitioned
  }

  static async init(
    request: Request,
    secrets: string[],
    cookieOptions?: PreviewCookieOptions,
  ): Promise<PreviewSession> {
    const storage = createCookieSessionStorage<PreviewSessionData>({
      cookie: {
        httpOnly: true,
        path: '/',
        sameSite: 'none',
        secure: true,
        ...cookieOptions,
        name: perspectiveCookieName,
        secrets,
      },
    })

    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession())

    // Browsers that block unpartitioned third-party cookies (Safari blocks them
    // outright) drop this cookie when Presentation frames the storefront, so
    // preview mode never enables. Opt into CHIPS for that case only: partitioning
    // top-level requests would needlessly change the cookie's identity for the
    // already-working "open preview in a new tab" flow.
    const partitioned =
      cookieOptions?.partitioned ?? (session.get('partitioned') || isCrossSiteIframe(request))

    if (partitioned) {
      session.set('partitioned', true)
    }

    return new this(storage, session, partitioned)
  }

  get has(): SanityPreviewSession['has'] {
    return this.#session.has
  }

  get get(): SanityPreviewSession['get'] {
    return this.#session.get
  }

  get unset(): SanityPreviewSession['unset'] {
    return this.#session.unset
  }

  get set(): SanityPreviewSession['set'] {
    return this.#session.set
  }

  destroy(): ReturnType<SanityPreviewSession['destroy']> {
    return this.#sessionStorage.destroySession(this.#session, {partitioned: this.#partitioned})
  }

  commit(): ReturnType<SanityPreviewSession['commit']> {
    return this.#sessionStorage.commitSession(this.#session, {partitioned: this.#partitioned})
  }
}
