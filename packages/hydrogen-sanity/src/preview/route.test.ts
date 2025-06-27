import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityContext, type SanityContext} from '../context'
import {action, loader} from './route'
import {SanityPreviewSession} from './session'

vi.mock('@sanity/preview-url-secret', async (importOriginal) => {
  const module = await importOriginal<typeof import('@sanity/preview-url-secret')>()
  return {
    ...module,
    validatePreviewUrl: vi.fn().mockResolvedValue({isValid: true, redirectTo: '/'}),
  }
})

interface AppLoadContext {
  sanity: SanityContext
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the preview route', async () => {
  const request = new Request('http://localhost')
  const session = await SanityPreviewSession.init(request, ['secret'])

  const sanity = createSanityContext({
    request,
    client: {projectId: 'my-project-id', dataset: 'my-dataset'},
    preview: {
      enabled: true,
      token: 'my-token',
      studioUrl: '/',
      session,
    },
  })

  const context: AppLoadContext = {
    sanity,
  }

  it('should enable preview mode', async () => {
    const response = await loader({context, request, params: {}})
    expect(response).toSatisfy(
      (value) => value instanceof Response && value.status >= 300 && value.status < 400,
    )
  })

  it('should disable preview mode', async () => {
    const disablePreviewRequest = new Request('http://localhost', {method: 'POST'})
    const response = await action({context, request: disablePreviewRequest, params: {}})
    expect(response).toSatisfy(
      (value) => value instanceof Response && value.status >= 200 && value.status < 300,
    )
  })
})
