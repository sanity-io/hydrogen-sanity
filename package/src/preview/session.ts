/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type {HydrogenSession} from '@shopify/hydrogen'
import {createCookieSessionStorage, type Session, type SessionStorage} from '@shopify/remix-oxygen'

export class SanityPreviewSession implements HydrogenSession {
  public isPending = false

  #sessionStorage
  #session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'sanityPreviewSession',
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

  get has() {
    return this.#session.has
  }

  get get() {
    return this.#session.get
  }

  get flash() {
    return this.#session.flash
  }

  get unset() {
    this.isPending = true
    return this.#session.unset
  }

  get set() {
    this.isPending = true
    return this.#session.set
  }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session)
  }

  commit() {
    this.isPending = false
    return this.#sessionStorage.commitSession(this.#session)
  }
}
