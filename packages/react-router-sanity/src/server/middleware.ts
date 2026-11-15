import type {MiddlewareFunction} from 'react-router'

import {sanityContext} from '../context'
import {SanityRouterError} from '../errors'
import type {PreviewState} from '../types'
import type {SanityMiddlewareConfig, SanityMiddlewareConfigFunction} from './config'
import {CDN_TAG_HEADERS, cdnTagHeaderValue, serverTimingValue, withMutableHeaders} from './headers'
import {sanityInternalContext, type SanityInternalState} from './internal'
import {RequestContext} from './request-context'
import {
  cookiePreviewSession,
  isPreviewSessionData,
  PREVIEW_SESSION_KEY,
  type PreviewSession,
} from './session'

/**
 * The cookie that `<SanityLive>` sets for one revalidation request. It carries the id of the
 * last live event, so the API CDN serves content at least as new as that event.
 */
export const LIVE_EVENT_COOKIE = '__sanity_live_event'

const DISABLED: PreviewState = {enabled: false, perspective: 'published'}

async function resolveSession(
  config: SanityMiddlewareConfig,
  request: Request,
): Promise<PreviewSession | undefined> {
  const preview = config.preview
  if (!preview) return undefined
  if (preview.session) return preview.session(request)
  if (!preview.sessionSecrets?.length) return undefined
  return cookiePreviewSession({secrets: preview.sessionSecrets, cookieName: preview.cookieName})(request)
}

function readPreviewState(
  config: SanityMiddlewareConfig,
  session: PreviewSession | undefined,
): PreviewState {
  if (!session || !config.serverToken) return DISABLED
  const data = session.get(PREVIEW_SESSION_KEY)
  if (!isPreviewSessionData(data)) return DISABLED
  const {projectId, dataset} = config.client.config()
  // A session for another project or dataset does not grant preview here.
  if (data.projectId !== projectId || data.dataset !== dataset) return DISABLED
  return {
    enabled: true,
    perspective: data.perspective,
    ...(data.variant ? {variant: data.variant} : {}),
  }
}

function readLiveEventId(request: Request): string | undefined {
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === LIVE_EVENT_COOKIE) return decodeURIComponent(rest.join('=')) || undefined
  }
  return undefined
}

/**
 * Creates the Sanity middleware. Register it once on the root route.
 *
 * For each request, the middleware creates the Sanity request context, reads the preview session,
 * and sets response headers: `Set-Cookie` for preview changes, `Cache-Control: private, no-store`
 * in preview, `Server-Timing`, and an optional CDN tag header.
 *
 * @param config - The config, or a function that returns the config for a request.
 * @returns A React Router middleware.
 * @throws RRS011 when the config has no `client`.
 * @example
 * ```ts
 * // app/root.tsx
 * export const middleware = [
 *   createSanityMiddleware(({context}) => ({
 *     client: createClient({projectId, dataset, apiVersion: '2026-11-01', useCdn: true}),
 *   })),
 * ]
 * ```
 * @public
 */
export function createSanityMiddleware(
  config: SanityMiddlewareConfig | SanityMiddlewareConfigFunction,
): MiddlewareFunction<Response> {
  return async ({request, context}, next) => {
    const resolved = typeof config === 'function' ? await config({request, context}) : config
    if (!resolved?.client) throw new SanityRouterError('RRS011')

    const session = await resolveSession(resolved, request)
    const preview = readPreviewState(resolved, session)
    const sanity = new RequestContext({
      config: resolved,
      preview,
      lastLiveEventId: readLiveEventId(request),
    })
    const internal: SanityInternalState = {
      config: resolved,
      request,
      session,
      sessionDirty: false,
      previewChanged: false,
    }
    context.set(sanityContext, sanity)
    context.set(sanityInternalContext, internal)

    const response = withMutableHeaders(await next())

    if (internal.sessionDirty && session) {
      const cookies = await session.commit()
      for (const cookie of Array.isArray(cookies) ? cookies : [cookies]) {
        // Append, never set: another middleware can also write cookies on this response.
        response.headers.append('Set-Cookie', cookie)
      }
    }

    if (preview.enabled || internal.previewChanged) {
      response.headers.set('Cache-Control', 'private, no-store')
      for (const header of CDN_TAG_HEADERS) response.headers.delete(header)
      if (resolved.cdnTags) response.headers.delete(resolved.cdnTags.header)
    } else if (resolved.cdnTags) {
      const {projectId = '', dataset = ''} = resolved.client.config()
      response.headers.set(
        resolved.cdnTags.header,
        cdnTagHeaderValue(sanity.syncTags(), {...resolved.cdnTags, projectId, dataset}),
      )
    }

    if (resolved.serverTiming !== false) {
      response.headers.append(
        'Server-Timing',
        serverTimingValue(sanity.timing.counts, sanity.timing.apiMs),
      )
    }

    return response
  }
}
