import type {HydrogenSession} from '@shopify/hydrogen'
import {describe, expect, it, vi} from 'vitest'

import {createSanityContext, type SanityContext} from '../context'
import {action, loader} from './route'

vi.mock('./client', {spy: true})

type AppLoadContext = {
  session: HydrogenSession
  sanity: SanityContext
}

class Session implements HydrogenSession {
  #data = new Map()

  get(key: string) {
    return this.#data.get(key)
  }

  set(key: string, value: unknown) {
    this.#data.set(key, value)
  }

  unset(key: string) {
    this.#data.delete(key)
  }

  async commit() {
    return JSON.stringify(this.#data)
  }
}

describe('the preview route', () => {
  const request = new Request('https://example.com')

  const sanity = createSanityContext({
    request,
    client: {projectId: 'my-project-id', dataset: 'my-dataset'},
    preview: {
      enabled: true,
      token: 'my-token',
      studioUrl: 'https://example.com',
    },
  })

  const context: AppLoadContext = {
    session: new Session(),
    sanity,
  }

  it('should enable preview mode', async () => {
    const response = await loader({context, request, params: {}})
    expect(response).toBeInstanceOf(Response)
  })

  it('should disable preview mode', async () => {
    const response = await action({context, request, params: {}})
    expect(response).toBeInstanceOf(Response)
  })
})
