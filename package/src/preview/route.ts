import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {type ActionFunction, json, type LoaderFunction, redirect} from '@shopify/remix-oxygen'

/**
 * A `POST` request to this route will exit preview mode
 */
export const action: ActionFunction = async ({context, request}) => {
  if (request.method !== 'POST') {
    return json({message: 'Method not allowed'}, 405)
  }

  // TODO: make this a callback? `onExitPreview`?
  await context.session.unset('projectId')

  // TODO: confirm that the redirect and setting cookie has to happen here?
  return redirect('/', {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  })
}

/**
 * A `GET` request to this route will enter preview mode
 */
export const loader: LoaderFunction = async ({context, request}) => {
  const {sanity} = context
  const projectId = sanity.client.config().projectId

  if (!sanity.preview?.token || !projectId) {
    throw new Response('Unable to enable preview mode. Please check your preview configuration', {
      status: 500,
    })
  }

  const clientWithToken = sanity.client.withConfig({
    useCdn: false,
    token: sanity.preview.token,
  })

  const {isValid, redirectTo = '/'} = await validatePreviewUrl(clientWithToken, request.url)

  if (!isValid) {
    throw new Response('Invalid secret', {status: 401})
  }

  // TODO: make this a callback? `onEnterPreview`?
  await context.session.set('projectId', projectId)

  // TODO: confirm that the redirect and setting cookie has to happen here?
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  })
}
