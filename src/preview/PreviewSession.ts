import {CookieSessionStorageOptions} from '@remix-run/server-runtime'
import {createCookieSessionStorage, type Session, type SessionStorage} from '@shopify/remix-oxygen'

/**
 * TODO: needs inline documentation
 */
export class PreviewSession {
  #sessionStorage: SessionStorage
  #session: Session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(
    request: Request,
    cookieOptionsOrSecrets: string[] | CookieSessionStorageOptions
  ): Promise<PreviewSession> {
    const storage = createCookieSessionStorage({
      cookie: Array.isArray(cookieOptionsOrSecrets)
        ? {
            name: '__preview',
            httpOnly: true,
            sameSite: true,
            secrets: cookieOptionsOrSecrets,
          }
        : cookieOptionsOrSecrets,
    })

    const session = await storage.getSession(request.headers.get('Cookie'))

    return new this(storage, session)
  }

  has(key: string): boolean {
    return this.#session.has(key)
  }

  // get(key: string) {
  //   return this.session.get(key);
  // }

  destroy(): Promise<string> {
    return this.#sessionStorage.destroySession(this.#session)
  }

  // unset(key: string) {
  //   this.session.unset(key);
  // }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  set(key: string, value: any): void {
    this.#session.set(key, value)
  }

  commit(): Promise<string> {
    return this.#sessionStorage.commitSession(this.#session)
  }
}
