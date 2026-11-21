/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type {SanityContext} from './context'
import type {SanityPreviewSession} from './preview/session'
import type {HydrogenSession, WaitUntil} from './types'

/** An in-memory Web Cache API cache. It never expires entries. */
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

/** An in-memory key-value store that records the TTL of each entry. */
export class MapStore {
  readonly entries = new Map<string, {value: unknown; ttl: number | undefined}>()

  get(key: string): unknown {
    return this.entries.get(key)?.value
  }

  set(key: string, value: unknown, options?: {ttl?: number}): void {
    this.entries.set(key, {value, ttl: options?.ttl})
  }

  delete(key: string): void {
    this.entries.delete(key)
  }
}

/** A `waitUntil` that collects background cache writes, so a test can wait for them. */
export function createWaitUntil(): {waitUntil: WaitUntil; flush: () => Promise<unknown>} {
  const pending: Promise<unknown>[] = []
  return {
    waitUntil: (promise) => {
      pending.push(promise)
    },
    flush: () => Promise.all(pending.splice(0)),
  }
}

export class Session implements HydrogenSession {
  protected data = new Map()

  get(key: string) {
    return this.data.get(key)
  }

  set(key: string, value: unknown) {
    this.data.set(key, value)
  }

  unset(key: string) {
    this.data.delete(key)
  }

  async commit() {
    return `cookie-${JSON.stringify(Object.fromEntries(this.data))}`
  }
}

export class PreviewSession extends Session implements SanityPreviewSession {
  has(key: string) {
    return this.get(key) !== undefined
  }

  async destroy() {
    this.data.clear()
    return 'destroyed-cookie'
  }
}

export type AppLoadContext = {
  session: HydrogenSession
  sanity: SanityContext
}
