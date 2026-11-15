/**
 * The preview resource route: enable, change perspective or variant, and exit. Server only.
 *
 * @example
 * ```ts
 * // app/routes/api.preview.ts
 * export {loader, action} from 'react-router-sanity/preview/route'
 * ```
 * @packageDocumentation
 */
import type {ClientPerspective} from '@sanity/client'
import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {redirect, type RouterContextProvider} from 'react-router'

import {SanityRouterError} from '../errors'
import {getInternal, type SanityInternalState} from '../server/internal'
import {isPerspective, isPreviewSessionData, PREVIEW_SESSION_KEY} from '../server/session'

/**
 * Gives the arguments of the preview route handlers.
 *
 * @public
 */
export interface PreviewRouteArgs {
  /** Gives the request. */
  request: Request
  /** Gives the router context. The Sanity middleware sets the Sanity values on it. */
  context: Readonly<RouterContextProvider>
}

const NO_STORE = {'Cache-Control': 'private, no-store'}

function deny(status: 401 | 403 | 405): Response {
  return new Response(null, {status, headers: NO_STORE})
}

/**
 * Parses a perspective from a form value or a Studio search param.
 *
 * Accepts a JSON array, a comma-separated list, or a single name.
 *
 * @internal
 */
export function parsePerspective(raw: unknown): ClientPerspective | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  let value: unknown = raw
  if (raw.startsWith('[')) {
    try {
      value = JSON.parse(raw)
    } catch {
      return undefined
    }
  } else if (raw.includes(',')) {
    value = raw.split(',').map((part) => part.trim())
  }
  return isPerspective(value) ? value : undefined
}

function requirePreviewConfig(internal: SanityInternalState) {
  const {config, session} = internal
  if (!config.serverToken) throw new SanityRouterError('RRS020')
  if (!session) throw new SanityRouterError('RRS021')
  return {config, session, serverToken: config.serverToken}
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  return origin !== null && origin === new URL(request.url).origin
}

/**
 * Enables preview. Presentation calls this route with a one-hour secret in the URL.
 *
 * The loader validates the secret against the Content Lake with the server token, writes a signed
 * preview session, and redirects to the requested path. An invalid secret gives a 401 with no
 * detail.
 *
 * @param args - The request and the router context.
 * @returns A 307 redirect, or a 401 response.
 * @throws RRS020 when the config has no `serverToken`.
 * @throws RRS021 when the config has no preview session.
 * @public
 */
export async function loader({request, context}: PreviewRouteArgs): Promise<Response> {
  const internal = getInternal(context)
  const {config, session, serverToken} = requirePreviewConfig(internal)

  const client = config.client.withConfig({
    token: serverToken,
    useCdn: false,
    perspective: 'raw',
    stega: {enabled: false},
    ignoreBrowserTokenWarning: true,
  })
  const result = await validatePreviewUrl(client, request.url)
  if (!result.isValid) return deny(401)

  const allowed = config.preview?.allowedStudioOrigins
  if (allowed && (!result.studioOrigin || !allowed.includes(result.studioOrigin))) return deny(401)

  const {projectId = '', dataset = ''} = config.client.config()
  const perspective =
    parsePerspective(result.studioPreviewPerspective) ?? config.preview?.defaultPerspective ?? 'drafts'
  const variant = result.studioPreviewVariant ?? undefined
  session.set(PREVIEW_SESSION_KEY, {projectId, dataset, perspective, ...(variant ? {variant} : {})})
  internal.sessionDirty = true
  internal.previewChanged = true

  // `validatePreviewUrl` limits `redirectTo` to a relative path.
  return redirect(result.redirectTo ?? '/', {status: 307, headers: NO_STORE})
}

/**
 * Changes the preview perspective or variant (`PUT`), or exits preview (`POST` or `DELETE`).
 *
 * Every method requires an `Origin` header that matches the request origin. `PUT` also requires a
 * live preview session for the same project and dataset. `<VisualEditing>` sends `PUT` when the
 * editor changes the perspective in Presentation.
 *
 * @param args - The request and the router context.
 * @returns JSON for `PUT`, a 303 redirect to `/` for exit, or 403 or 405 on rejection.
 * @throws RRS020 when the config has no `serverToken`.
 * @throws RRS021 when the config has no preview session.
 * @public
 */
export async function action({request, context}: PreviewRouteArgs): Promise<Response> {
  const internal = getInternal(context)
  const {config, session} = requirePreviewConfig(internal)
  if (!isSameOrigin(request)) return deny(403)

  if (request.method === 'POST' || request.method === 'DELETE') {
    session.unset(PREVIEW_SESSION_KEY)
    internal.sessionDirty = true
    internal.previewChanged = true
    return redirect('/', {status: 303, headers: NO_STORE})
  }

  if (request.method !== 'PUT') return deny(405)

  const current = session.get(PREVIEW_SESSION_KEY)
  const {projectId, dataset} = config.client.config()
  if (!isPreviewSessionData(current) || current.projectId !== projectId || current.dataset !== dataset) {
    return deny(403)
  }

  const form = await request.formData()
  const rawPerspective = form.get('perspective')
  const rawVariant = form.get('variant')
  const perspective = rawPerspective === null ? current.perspective : parsePerspective(rawPerspective)
  if (!perspective) return Response.json({error: 'RRS022'}, {status: 400, headers: NO_STORE})

  let variant = current.variant
  if (typeof rawVariant === 'string') variant = rawVariant.length > 0 ? rawVariant : undefined

  session.set(PREVIEW_SESSION_KEY, {...current, perspective, variant})
  internal.sessionDirty = true
  internal.previewChanged = true
  return Response.json({perspective, variant: variant ?? null}, {headers: NO_STORE})
}
