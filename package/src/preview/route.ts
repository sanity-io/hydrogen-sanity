import {validatePreviewUrl} from '@sanity/preview-url-secret'
import type {HydrogenSession} from '@shopify/hydrogen'
import {type ActionFunction, json, type LoaderFunction, redirect} from '@shopify/remix-oxygen'

import type {SanityContext} from '../context'
import {sanitizePerspective} from '../sanitizePerspective'
import {assertSession} from '../utils'

/**
 * A `POST` request to this route will exit preview mode, a `PUT` request will change the preview perspective
 * TODO use `DELETE` instead of `POST` for exiting
 */
export const action: ActionFunction = async ({context, request}) => {
  if (request.method === 'PUT') {
    try {
      const {sanity, session} = context as {sanity: SanityContext; session: HydrogenSession}
      const projectId = sanity.client.config().projectId

      if (!sanity.preview) {
        return new Response('Preview mode is not enabled in this environment.', {status: 403})
      }

      if (!sanity.preview.token) {
        throw new Error('Enabling preview mode requires a token.')
      }

      if (!projectId) {
        throw new Error('No `projectId` found in the client config.')
      }

      if (!assertSession(session)) {
        throw new Error('Session is not an instance of HydrogenSession')
      }

      const sessionProjectId = await session.get('projectId')
      if (sessionProjectId && sessionProjectId !== projectId) {
        return new Response('Invalid projectId', {status: 400})
      }

      const formData = await request.formData()
      const formPerspective = formData.get('perspective')

      if (!formPerspective || typeof formPerspective !== 'string') {
        return new Response('Invalid perspective', {status: 400})
      }
      const perspective = sanitizePerspective(formPerspective)
      await session.set(
        'perspective',
        Array.isArray(perspective) ? perspective.join(',') : perspective,
      )

      return new Response('OK', {status: 204})
    } catch (error) {
      console.error(error)
      throw new Response(
        'Unable to change preview mode perspective. Please check your preview configuration',
        {
          status: 500,
        },
      )
    }
  }

  if (request.method !== 'POST') {
    return json({message: 'Method not allowed'}, 405)
  }

  try {
    const {session} = context
    if (!assertSession(session)) {
      throw new Error('Session is not an instance of HydrogenSession')
    }

    // TODO: make this a callback? `onExitPreview`?
    await session.unset('projectId')

    // TODO: confirm that the redirect and setting cookie has to happen here?
    return redirect('/')
  } catch (error) {
    console.error(error)
    throw new Response('Unable to disable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }
}

/**
 * A `GET` request to this route will enter preview mode
 */
export const loader: LoaderFunction = async ({context, request}) => {
  try {
    // TODO: to remove
    const {sanity, session} = context as {sanity: SanityContext; session: HydrogenSession}
    const projectId = sanity.client.config().projectId

    if (!sanity.preview) {
      return new Response('Preview mode is not enabled in this environment.', {status: 403})
    }

    if (!sanity.preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    if (!projectId) {
      throw new Error('No `projectId` found in the client config.')
    }

    if (!assertSession(session)) {
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

    await session.set('perspective', studioPreviewPerspective)

    // TODO: make this a callback? `onEnterPreview`?
    await session.set('projectId', projectId)

    // TODO: confirm that the redirect and setting cookie has to happen here?
    return redirect(redirectTo)
  } catch (error) {
    console.error(error)
    throw new Response('Unable to enable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }
}
