import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {type ActionFunction, type AppLoadContext, type LoaderFunction, redirect} from 'react-router'

import type {SanityContext} from '../context'
import {isHydrogenSession, isSanityPreviewSession, sanitizePerspective} from '../utils'

const PREVIEW_NOT_CONFIGURED =
  'Preview mode is not configured: pass `preview: {token, session}` to `createSanityContext`. The example storefront sets it only when both `SANITY_PREVIEW_TOKEN` and `SESSION_SECRET` are set.'

function isSanityContext(value: unknown): value is SanityContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'client' in value &&
    'query' in value &&
    typeof value.query === 'function'
  )
}

/**
 * Reads `context.sanity`. The route reads it as a property, so `server.ts` must set it.
 */
function getSanity(context: AppLoadContext): SanityContext {
  const sanity: unknown = context.sanity
  if (!isSanityContext(sanity)) {
    throw new Error(
      '`context.sanity` is not set. Create it with `createSanityContext` in `server.ts` and return it as `sanity` from the request context.',
    )
  }
  return sanity
}

/**
 * Prefers the dedicated preview session, and falls back to the app's own `context.session`.
 */
function getSession(sanity: SanityContext, context: AppLoadContext): unknown {
  return sanity.preview?.session ?? context.session
}

const INVALID_SESSION =
  'The preview session must have `get`, `set`, `unset` and `commit` methods. Pass a `PreviewSession` from `hydrogen-sanity/preview/session` as `preview.session`.'

/**
 * Route action handler for preview mode management.
 * POST/DELETE: disable preview mode, PUT: change preview perspective.
 */
export const action: ActionFunction = async ({context, request}) => {
  switch (request.method) {
    case 'POST':
    case 'DELETE': {
      try {
        // Leaving preview mode must work even when `context.sanity` is missing
        const sanity: unknown = context.sanity
        const session = isSanityContext(sanity) ? getSession(sanity, context) : context.session

        const headers = new Headers()
        if (isSanityPreviewSession(session)) {
          headers.set('Set-Cookie', await session.destroy())
        } else if (isHydrogenSession(session)) {
          session.unset('projectId')
          session.unset('perspective')
          headers.set('Set-Cookie', await session.commit())
        }

        return redirect('/', {
          headers,
        })
      } catch (error) {
        console.error(error)
        throw new Response(
          'Unable to disable preview mode. Please check your preview configuration',
          {
            status: 500,
          },
        )
      }
    }

    case 'PUT': {
      try {
        const sanity = getSanity(context)

        if (!sanity.preview) {
          console.warn(PREVIEW_NOT_CONFIGURED)
          return new Response('Preview mode is not enabled in this environment.', {status: 403})
        }

        if (!sanity.preview.token) {
          throw new Error('Enabling preview mode requires a token.')
        }

        const session = getSession(sanity, context)
        if (!isHydrogenSession(session)) {
          throw new Error(INVALID_SESSION)
        }

        const projectId = sanity.client.config().projectId
        if (!projectId) {
          throw new Error('No `projectId` found in the client config.')
        }

        // Only a session that entered preview mode through the loader may change its perspective
        const sessionProjectId = session.get('projectId')
        if (!sessionProjectId) {
          return new Response('Preview mode is not active.', {status: 403})
        }
        if (sessionProjectId !== projectId) {
          return new Response('Invalid projectId', {status: 400})
        }

        const formData = await request.formData()
        let perspective: ReturnType<typeof sanitizePerspective>
        try {
          perspective = sanitizePerspective(formData.get('perspective'))
        } catch {
          return new Response('Invalid perspective', {status: 400})
        }
        session.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)

        return new Response('OK', {
          status: 200,
          headers: {
            'Set-Cookie': await session.commit(),
          },
        })
      } catch (error) {
        console.error(error)
        throw new Response(
          'Unable to enable preview mode. Please check your preview configuration',
          {
            status: 500,
          },
        )
      }
    }

    default:
      return new Response('Method not allowed', {status: 405})
  }
}

/**
 * Route loader handler for entering preview mode.
 * Validates secret token and activates preview session.
 */
export const loader: LoaderFunction = async ({context, request}) => {
  try {
    const sanity = getSanity(context)

    if (!sanity.preview) {
      console.warn(PREVIEW_NOT_CONFIGURED)
      return new Response('Preview mode is not enabled in this environment.', {status: 403})
    }

    if (!sanity.preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const projectId = sanity.client.config().projectId
    if (!projectId) {
      throw new Error('No `projectId` found in the client config.')
    }

    const session = getSession(sanity, context)
    if (!isHydrogenSession(session)) {
      throw new Error(INVALID_SESSION)
    }

    const clientWithToken = sanity.client.withConfig({
      useCdn: false,
      token: sanity.preview.token,
    })

    const {
      isValid,
      redirectTo = '/',
      studioPreviewPerspective = 'drafts',
    } = await validatePreviewUrl(clientWithToken, request.url)

    if (!isValid) {
      return new Response('Invalid secret', {status: 401})
    }

    session.set('projectId', projectId)
    session.set('perspective', studioPreviewPerspective)

    return redirect(redirectTo, {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    })
  } catch (error) {
    console.error(error)
    throw new Response('Unable to enable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }
}
