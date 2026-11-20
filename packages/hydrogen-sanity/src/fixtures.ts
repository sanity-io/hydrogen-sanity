import type {SanityContext} from './context'
import type {SanityPreviewSession} from './preview/session'
import type {HydrogenSession} from './types'

/** A Web Cache double that every supported Hydrogen version accepts. It never expires entries. */
export class MapCache implements Cache {
  #entries = new Map<string, Response>()

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.#entries.get(new Request(request).url)?.clone()
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.#entries.set(new Request(request).url, response.clone())
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.#entries.delete(new Request(request).url)
  }

  add(): Promise<void> {
    throw new Error('Not implemented')
  }

  addAll(): Promise<void> {
    throw new Error('Not implemented')
  }

  keys(): Promise<readonly Request[]> {
    throw new Error('Not implemented')
  }

  matchAll(): Promise<readonly Response[]> {
    throw new Error('Not implemented')
  }
}

export class Session implements HydrogenSession {
  protected data = new Map()

  // oxlint-disable-next-line typescript/explicit-module-boundary-types -- the double is untyped so it fits every session shape
  get(key: string) {
    return this.data.get(key)
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value)
  }

  unset(key: string): void {
    this.data.delete(key)
  }

  async commit(): Promise<string> {
    return `cookie-${JSON.stringify(Object.fromEntries(this.data))}`
  }
}

export class PreviewSession extends Session implements SanityPreviewSession {
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  async destroy(): Promise<string> {
    this.data.clear()
    return 'destroyed-cookie'
  }
}

export type AppLoadContext = {
  session: HydrogenSession
  sanity: SanityContext
}
