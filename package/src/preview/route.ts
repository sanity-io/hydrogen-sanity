import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {
  type ActionFunction,
  AppLoadContext,
  type LoaderFunction,
  redirect,
} from '@shopify/remix-oxygen'

import type {SanityContext} from '../context'
import {sanitizePerspective} from '../utils'
import {isHydrogenSession, isSanityPreviewSession} from '../utils'

function getSession(context: AppLoadContext) {
  const preview = (context.sanity as SanityContext)?.preview
  const session =
    preview && 'session' in preview && preview.session ? preview.session : context.session
  return session
}

/**
 * A `POST` or `DELETE` request to this route will disable preview mode
 * A `PUT` request will change the preview perspective
 */
export const action: ActionFunction = async ({context, request}) => {
  switch (request.method) {
    case 'POST':
    case 'DELETE': {
      try {
        const session = getSession(context)

        const headers = new Headers()
        if (isSanityPreviewSession(session)) {
          headers.set('Set-Cookie', await session.destroy())
        } else if (isHydrogenSession(session)) {
          session.unset('projectId')
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
        const sanity = context.sanity as SanityContext

        if (!sanity.preview) {
          return new Response('Preview mode is not enabled in this environment.', {status: 403})
        }

        if (!sanity.preview.token) {
          throw new Error('Enabling preview mode requires a token.')
        }

        if (!sanity.preview) {
          return new Response('Preview mode is not enabled in this environment.', {status: 403})
        }

        if (!sanity.preview.token) {
          throw new Error('Enabling preview mode requires a token.')
        }

        const session = getSession(context)
        if (!isHydrogenSession(session)) {
          throw new Error('Session is not an instance of HydrogenSession')
        }

        const projectId = sanity.client.config().projectId
        if (!projectId) {
          throw new Error('No `projectId` found in the client config.')
        }

        const sessionProjectId = session.get('projectId')
        if (sessionProjectId && sessionProjectId !== projectId) {
          return new Response('Invalid projectId', {status: 400})
        }

        const formData = await request.formData()
        const perspective = sanitizePerspective(formData.get('perspective'))
        session.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)

        return new Response('OK', {status: 200})
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
 * A `GET` request to this route will enter preview mode
 */
export const loader: LoaderFunction = async ({context, request}) => {
  try {
    const session = getSession(context)
    const sanity = context.sanity as SanityContext

    if (!sanity.preview) {
      return new Response('Preview mode is not enabled in this environment.', {status: 403})
    }

    if (!sanity.preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const projectId = sanity.client.config().projectId
    if (!projectId) {
      throw new Error('No `projectId` found in the client config.')
    }

    if (!isHydrogenSession(session)) {
      throw new Error('Session is not an instance of HydrogenSession')
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
