import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'
import {createCookieSessionStorage, type Session, type SessionStorage} from 'react-router'

type SanitySessionData = {perspective: string}

export interface SanitySession {
  has: Session<SanitySessionData, never>['has']
  get: Session<SanitySessionData, never>['get']
  set: Session<SanitySessionData, never>['set']
  unset: Session<SanitySessionData, never>['unset']
  commit: () => ReturnType<SessionStorage<SanitySessionData, never>['commitSession']>
  destroy: () => ReturnType<SessionStorage<SanitySessionData, never>['destroySession']>
}

export class SanityPreviewSession implements SanitySession {
  #sessionStorage
  #session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(request: Request, secrets: string[]): Promise<SanityPreviewSession> {
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

  get has(): SanitySession['has'] {
    return this.#session.has
  }

  get get(): SanitySession['get'] {
    return this.#session.get
  }

  get unset(): SanitySession['unset'] {
    return this.#session.unset
  }

  get set(): SanitySession['set'] {
    return this.#session.set
  }

  destroy(): ReturnType<SanitySession['destroy']> {
    return this.#sessionStorage.destroySession(this.#session)
  }

  commit(): ReturnType<SanitySession['commit']> {
    return this.#sessionStorage.commitSession(this.#session)
  }
}
