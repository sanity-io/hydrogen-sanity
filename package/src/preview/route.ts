import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {type ActionFunction, json, type LoaderFunction, redirect} from '@shopify/remix-oxygen'

import type {SanityContext} from '../context'

/**
 * A `POST` request to this route will exit preview mode
 */
export const action: ActionFunction = async ({context, request}) => {
  try {
    if (request.method !== 'POST') {
      return json({message: 'Method not allowed'}, 405)
    }

    const {sanity} = context as {sanity: SanityContext}

    if (!sanity.preview) {
      return new Response('Preview mode is not enabled in this environment.', {status: 403})
    }

    await sanity.preview.onDisablePreview(context)

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
    const {sanity} = context as {sanity: SanityContext}

    if (!sanity.preview) {
      return new Response('Preview mode is not enabled in this environment.', {status: 403})
    }

    if (!sanity.preview.token) {
      throw new Error('Enabling preview mode requires a token.')
    }

    const clientWithToken = sanity.client.withConfig({
      useCdn: false,
      token: sanity.preview.token,
    })

    const {isValid, redirectTo = '/'} = await validatePreviewUrl(clientWithToken, request.url)

    if (!isValid) {
      return new Response('Invalid secret', {status: 401})
    }

    await sanity.preview.onEnablePreview(context)

    return redirect(redirectTo)
  } catch (error) {
    console.error(error)
    throw new Response('Unable to enable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }
}
