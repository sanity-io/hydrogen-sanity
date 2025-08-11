/* eslint-disable max-nested-callbacks */
import type {HydrogenSession} from '@shopify/hydrogen'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createSanityContext, type SanityContext} from '../context'
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

type AppLoadContext = {
  session: HydrogenSession
  sanity: SanityContext
}

class Session implements HydrogenSession {
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

class PreviewSession extends Session {
  has(key: string) {
    return this.get(key) !== undefined
  }

  async destroy() {
    this.data.clear()
    return 'destroyed-cookie'
  }
}

describe('the preview route', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockValidatePreviewUrl: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSanitizePerspective: any
  const projectId = 'my-project-id'
  const dataset = 'my-dataset'
  const token = 'my-token'
  const studioUrl = 'https://example.com'

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

      const sanity = createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          studioUrl,
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
      const sanity = createSanityContext({
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

    it('fails when no preview token is provided', () => {
      expect(() => {
        createSanityContext({
          request,
          client: {projectId, dataset},
          // @ts-expect-error Testing when a token isn't provided
          preview: {
            studioUrl,
            session: new PreviewSession(),
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(`[Error: Enabling preview mode requires a token.]`)
    })

    it('fails when project ID is missing from client config', () => {
      expect(() => {
        createSanityContext({
          request,
          client: {dataset},
          preview: {
            token,
            studioUrl,
            session: new PreviewSession(),
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(`[Error: Configuration must contain \`projectId\`]`)
    })

    it('works with Hydrogen session when no preview session is provided', async () => {
      const sanity = createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          enabled: true,
          token,
          studioUrl,
        },
      })

      const hydrogenSession = new Session()
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
      const sanity = createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          studioUrl,
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
      const sanity = createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          studioUrl,
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
    it('exits preview mode correctly', async () => {
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

    it('exits preview mode', async () => {
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

      const sanity = createSanityContext({
        request,
        client: {projectId, dataset},
        preview: {
          token,
          studioUrl,
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

    describe('changing preview perspective with PUT requests', () => {
      it('changes the preview perspective successfully', async () => {
        const formData = new FormData()
        formData.set('perspective', 'published')
        const request = new Request('https://example.com', {
          method: 'PUT',
          body: formData,
        })

        const previewSession = new PreviewSession()
        previewSession.set('projectId', projectId)

        const sanity = createSanityContext({
          request,
          client: {projectId, dataset},
          preview: {
            token,
            studioUrl,
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

        const sanity = createSanityContext({
          request: new Request('https://example.com'),
          client: {projectId, dataset},
          preview: {
            token,
            studioUrl,
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
        const sanity = createSanityContext({
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

      it('fails when preview token is missing', async () => {
        const request = new Request('https://example.com', {method: 'PUT'})

        expect(() => {
          createSanityContext({
            request,
            client: {projectId, dataset},
            // @ts-expect-error Testing when token is missing
            preview: {
              studioUrl: 'https://example.com',
              session: new PreviewSession(),
            },
          })
        }).toThrow('Enabling preview mode requires a token.')
      })

      it('fails when session is not compatible', async () => {
        const request = new Request('https://example.com', {method: 'PUT'})
        const sanity = createSanityContext({
          request,
          client: {projectId, dataset},

          preview: {
            enabled: true,
            token,
            studioUrl: 'https://example.com',
          },
        })

        const context: AppLoadContext = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session: {} as any,
          sanity,
        }

        await expect(action({context, request, params: {}})).rejects.toMatchInlineSnapshot(`
        Response {
          Symbol(state): {
            "aborted": false,
            "body": {
              "length": 70,
              "source": "Unable to enable preview mode. Please check your preview configuration",
              "stream": ReadableStream {
                Symbol(kType): "ReadableStream",
                Symbol(kState): {
                  "controller": ReadableByteStreamController {
                    Symbol(kType): "ReadableByteStreamController",
                    Symbol(kState): {
                      "autoAllocateChunkSize": undefined,
                      "byobRequest": null,
                      "cancelAlgorithm": [Function],
                      "closeRequested": false,
                      "highWaterMark": 0,
                      "pendingPullIntos": [],
                      "pullAgain": false,
                      "pullAlgorithm": [Function],
                      "pulling": false,
                      "queue": [],
                      "queueTotalSize": 0,
                      "started": true,
                      "stream": [Circular],
                    },
                  },
                  "disturbed": false,
                  "reader": undefined,
                  "state": "readable",
                  "storedError": undefined,
                  "transfer": {
                    "port1": undefined,
                    "port2": undefined,
                    "promise": undefined,
                    "writable": undefined,
                  },
                },
                Symbol(nodejs.webstream.isClosedPromise): {
                  "promise": Promise {},
                  "reject": [Function],
                  "resolve": [Function],
                },
                Symbol(nodejs.webstream.controllerErrorFunction): [Function],
              },
            },
            "cacheState": "",
            "headersList": HeadersList {
              "cookies": null,
              Symbol(headers map): Map {
                "content-type" => {
                  "name": "content-type",
                  "value": "text/plain;charset=UTF-8",
                },
              },
              Symbol(headers map sorted): null,
            },
            "rangeRequested": false,
            "requestIncludesCredentials": false,
            "status": 500,
            "statusText": "",
            "timingAllowPassed": false,
            "timingInfo": null,
            "type": "default",
            "urlList": [],
          },
          Symbol(headers): Headers {},
        }
      `)
      })

      it('fails when project ID is missing from client config', async () => {
        const request = new Request('https://example.com', {method: 'PUT'})

        expect(() => {
          createSanityContext({
            request,
            client: {dataset},
            preview: {
              token,
              studioUrl: 'https://example.com',
              session: new PreviewSession(),
            },
          })
        }).toThrowErrorMatchingInlineSnapshot(`[Error: Configuration must contain \`projectId\`]`)
      })

      it('rejects requests when project ID in session does not match', async () => {
        const request = new Request('https://example.com', {method: 'PUT'})
        const previewSession = new PreviewSession()
        previewSession.set('projectId', 'different-project-id')

        const sanity = createSanityContext({
          request,
          client: {projectId, dataset},
          preview: {
            session: previewSession,
            token,
            studioUrl: 'https://example.com',
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

      it('handles errors when changing perspective', async () => {
        const formData = new FormData()
        formData.set('perspective', 'published')
        const request = new Request('https://example.com', {
          method: 'PUT',
          body: formData,
        })
        const previewSession = new PreviewSession()

        // Mock the set method to throw an error
        previewSession.set = vi.fn(() => {
          throw new Error('Session error')
        })

        const sanity = createSanityContext({
          request,
          client: {projectId, dataset},
          preview: {
            session: previewSession,
            token,
            studioUrl: 'https://example.com',
          },
        })

        const context: AppLoadContext = {
          session: new Session(),
          sanity,
        }

        await expect(action({context, request, params: {}})).rejects.toThrow()
      })
    })
  })

  describe('unsupported request methods', () => {
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
})
