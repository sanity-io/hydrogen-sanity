import type {HydrogenSession} from '@shopify/hydrogen'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityContext, type SanityContext} from '../context'
import {action, loader} from './route'

vi.mock('@sanity/preview-url-secret', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/preview-url-secret')>()
  return {
    ...module,
    validatePreviewUrl: vi.fn().mockResolvedValue({isValid: true, redirectTo: '/'}),
  }
})

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the preview route', () => {
  const request = new Request('https://example.com')

  const onEnablePreview = vi.fn()
  const onDisablePreview = vi.fn()

  const sanity = createSanityContext({
    request,
    client: {projectId: 'my-project-id', dataset: 'my-dataset'},
    preview: {
      enabled: true,
      token: 'my-token',
      studioUrl: 'https://example.com',
      onEnablePreview,
      onDisablePreview,
    },
  })

  const context: AppLoadContext = {
    session: new Session(),
    sanity,
  }

  it('should enable preview mode', async () => {
    const response = await loader({context, request, params: {}})
    expect(response).toSatisfy(
      (value) => value instanceof Response && value.status >= 300 && value.status < 400,
    )
    expect(onEnablePreview).toHaveBeenCalledOnce()
  })

  it('should disable preview mode', async () => {
    const disablePreviewRequest = new Request('https://example.com', {method: 'POST'})
    const response = await action({context, request: disablePreviewRequest, params: {}})
    expect(response).toSatisfy(
      (value) => value instanceof Response && value.status >= 300 && value.status < 400,
    )
    expect(onDisablePreview).toHaveBeenCalledOnce()
  })
})
