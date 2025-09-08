import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityContext} from '../context'
import {type AppLoadContext, PreviewSession, Session} from '../fixtures'
import {action, loader} from './route'

vi.mock('@sanity/preview-url-secret', () => ({
  validatePreviewUrl: vi.fn(),
}))

vi.mock('../utils', async () => {
  const actual = await vi.importActual('../utils')
  return {
    ...actual,
    sanitizePerspective: vi.fn((value) => value || 'published'),
  }
})

describe('the preview route', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockValidatePreviewUrl: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSanitizePerspective: any
  const projectId = 'my-project-id'
  const dataset = 'my-dataset'
  const token = 'my-token'

  beforeEach(async () => {
    vi.clearAllMocks()
    mockValidatePreviewUrl = vi.mocked(
      (await import('@sanity/preview-url-secret')).validatePreviewUrl,
    )
    mockSanitizePerspective = vi.mocked((await import('../utils')).sanitizePerspective)
  })

  describe('entering preview mode', () => {
    const request = new Request('https://example.com?secret=test-secret')

    it('enters preview mode successfully', async () => {
      const previewSession = new PreviewSession()

      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      const perspective = 'drafts'
      const redirectTo = '/products'
      mockValidatePreviewUrl.mockResolvedValue({
        isValid: true,
        redirectTo,
        studioPreviewPerspective: perspective,
      })

      const response = await loader({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe(redirectTo)
      expect(previewSession.get('projectId')).toBe(projectId)
      expect(previewSession.get('perspective')).toBe(perspective)
    })

    it('blocks access when preview mode is disabled', async () => {
      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      const response = await loader({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(403)
      expect(await (response as Response).text()).toMatchInlineSnapshot(
        `"Preview mode is not enabled in this environment."`,
      )
    })

    it('fails when no preview token is provided', async () => {
      await expect(
        createSanityContext({
          request,
          client: {projectId, dataset},
          preview: {
            token: '', // Testing with empty token to trigger the error
            session: new PreviewSession(),
          },
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Enabling preview mode requires a token.]`,
      )
    })

    it('fails when project ID is missing from client config', async () => {
      await expect(
        createSanityContext({
          request,
          client: {dataset},
          preview: {
            token,
            session: new PreviewSession(),
          },
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Configuration must contain \`projectId\`]`,
      )
    })

    it('works with Hydrogen session is provided', async () => {
      const hydrogenSession = new Session()

      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          session: hydrogenSession,
          token,
        },
      })

      const context: AppLoadContext = {
        session: hydrogenSession,
        sanity,
      }

      const perspective = 'drafts'
      const redirectTo = '/collections'
      mockValidatePreviewUrl.mockResolvedValue({
        isValid: true,
        redirectTo,
        studioPreviewPerspective: perspective,
      })

      const response = await loader({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe(redirectTo)
      expect(hydrogenSession.get('projectId')).toBe(projectId)
      expect(hydrogenSession.get('perspective')).toBe(perspective)
    })

    it('rejects invalid preview URLs', async () => {
      const previewSession = new PreviewSession()
      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      mockValidatePreviewUrl.mockResolvedValue({
        isValid: false,
      })

      const response = await loader({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(401)
      expect(await (response as Response).text()).toMatchInlineSnapshot(`"Invalid secret"`)
    })

    it('uses default settings when redirect URL and perspective are not specified', async () => {
      const previewSession = new PreviewSession()
      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      mockValidatePreviewUrl.mockResolvedValue({
        isValid: true,
      })

      const response = await loader({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe('/')
      expect(previewSession.get('perspective')).toBe('drafts')
    })
  })

  describe('exiting preview mode', () => {
    it('exits preview mode with POST', async () => {
      const request = new Request('https://example.com', {method: 'POST'})
      const session = new Session()
      session.set('projectId', projectId)
      session.set('perspective', 'drafts')

      const context: AppLoadContext = {
        session,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanity: {} as any,
      }

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe('/')
      expect(session.get('projectId')).toBeUndefined()
      expect(session.get('perspective')).toBeUndefined()
    })

    it('exits preview mode with DELETE', async () => {
      const request = new Request('https://example.com', {method: 'DELETE'})
      const session = new Session()
      session.set('projectId', projectId)
      session.set('perspective', 'drafts')

      const context: AppLoadContext = {
        session,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanity: {} as any,
      }

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe('/')
      expect(session.get('projectId')).toBeUndefined()
      expect(session.get('perspective')).toBeUndefined()
    })

    it('exits preview mode when using a preview session', async () => {
      const request = new Request('https://example.com', {method: 'POST'})
      const previewSession = new PreviewSession()
      previewSession.set('projectId', projectId)
      previewSession.set('perspective', 'drafts')

      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('Location')).toBe('/')
      expect((response as Response).headers.get('Set-Cookie')).toBe('destroyed-cookie')
    })
  })

  describe('changing preview perspective', () => {
    it('changes the preview perspective successfully', async () => {
      const formData = new FormData()
      formData.set('perspective', 'published')
      const request = new Request('https://example.com', {
        method: 'PUT',
        body: formData,
      })

      const previewSession = new PreviewSession()
      previewSession.set('projectId', projectId)

      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      mockSanitizePerspective.mockReturnValue('published')

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(200)
      expect(await (response as Response).text()).toMatchInlineSnapshot(`"OK"`)
      expect(previewSession.get('perspective')).toBe('published')
      expect(mockSanitizePerspective).toHaveBeenCalledWith('published')
    })

    it('handles perspective values with multiple options', async () => {
      const formData = new FormData()
      formData.set('perspective', 'drafts,published')
      const request = new Request('https://example.com', {
        method: 'PUT',
        body: formData,
      })

      const previewSession = new PreviewSession()
      previewSession.set('projectId', projectId)

      const sanity = await createSanityContext({
        request: new Request('https://example.com'),
        client: {projectId, dataset},
        preview: {
          token,
          session: previewSession,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      mockSanitizePerspective.mockReturnValue(['drafts', 'published'])

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(200)
      expect(previewSession.get('perspective')).toBe('drafts,published')
    })

    it('blocks perspective changes when preview mode is disabled', async () => {
      const request = new Request('https://example.com', {method: 'PUT'})
      const sanity = await createSanityContext({
        request: new Request('https://example.com'),
        client: {projectId, dataset},
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(403)
      expect(await (response as Response).text()).toMatchInlineSnapshot(
        `"Preview mode is not enabled in this environment."`,
      )
    })

    it('rejects requests when project ID in session does not match', async () => {
      const request = new Request('https://example.com', {method: 'PUT'})
      const previewSession = new PreviewSession()
      previewSession.set('projectId', 'different-project-id')

      const sanity = await createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          session: previewSession,
          token,
        },
      })

      const context: AppLoadContext = {
        session: new Session(),
        sanity,
      }

      const response = await action({context, request, params: {}})

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(400)
      expect(await (response as Response).text()).toMatchInlineSnapshot(`"Invalid projectId"`)
    })
  })

  it('rejects unsupported HTTP methods', async () => {
    const request = new Request('https://example.com', {method: 'PATCH'})
    const context: AppLoadContext = {
      session: new Session(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanity: {} as any,
    }

    const response = await action({context, request, params: {}})

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(405)
    expect(await (response as Response).text()).toMatchInlineSnapshot(`"Method not allowed"`)
  })
})
