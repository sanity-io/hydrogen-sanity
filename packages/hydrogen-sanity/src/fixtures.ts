/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type {HydrogenSession} from '@shopify/hydrogen'

import type {SanityContext} from './context'
import type {SanityPreviewSession} from './preview/session'

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
