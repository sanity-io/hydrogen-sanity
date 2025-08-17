import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'
import {createCookieSessionStorage, type Session, type SessionStorage} from 'react-router'

interface PreviewSessionData {
  perspective: string
}

export interface SanityPreviewSession {
  has: Session<PreviewSessionData, never>['has']
  get: Session<PreviewSessionData, never>['get']
  set: Session<PreviewSessionData, never>['set']
  unset: Session<PreviewSessionData, never>['unset']
  commit: () => ReturnType<SessionStorage<PreviewSessionData, never>['commitSession']>
  destroy: () => ReturnType<SessionStorage<PreviewSessionData, never>['destroySession']>
}

export class PreviewSession implements SanityPreviewSession {
  #sessionStorage
  #session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(request: Request, secrets: string[]): Promise<PreviewSession> {
    const storage = createCookieSessionStorage({
      cookie: {
        name: perspectiveCookieName,
        httpOnly: true,
        path: '/',
        sameSite: 'none',
        secure: true,
        secrets,
      },
    })

    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession())

    return new this(storage, session)
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
    return this.#sessionStorage.destroySession(this.#session)
  }

  commit(): ReturnType<SanityPreviewSession['commit']> {
    return this.#sessionStorage.commitSession(this.#session)
  }
}
