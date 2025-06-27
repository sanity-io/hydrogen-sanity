import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {type ActionFunction, data, type LoaderFunction, redirect} from 'react-router'

import type {SanityContext} from '../context'
import {assertSession} from '../utils'

/**
 * A `POST` request to this route will exit preview mode
 */
export const action: ActionFunction = async ({context, request}) => {
  if (request.method !== 'POST') {
    return data({message: 'Method not allowed'}, 405)
  }

  try {
    const {sanity}: {sanity: SanityContext} = context
    const {session} = sanity.preview ?? {}
    if (!assertSession(session)) {
      throw new Error('Session is not an instance of HydrogenSession')
    }

    return new Response('Preview disabled successfully', {
      headers: {
        'Set-Cookie': await session.destroy(),
      },
      status: 200,
    })
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
    const {sanity}: {sanity: SanityContext} = context
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

    const {session} = sanity.preview

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
      studioPreviewPerspective,
    } = await validatePreviewUrl(clientWithToken, request.url)

    if (!isValid) {
      throw new Response('Invalid secret', {status: 401})
    }

    session.set('perspective', studioPreviewPerspective)

    const url = new URL(request.url)
    url.searchParams.delete('sanity-preview-secret')
    url.searchParams.delete('sanity-preview-pathname')

    return redirect(`${redirectTo}?${url.searchParams}`, {
      headers: {
        'Set-Cookie': await session.commit(),
      },
      status: 307,
    })
  } catch (error) {
    console.error(error)
    throw new Response('Unable to enable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }
}
