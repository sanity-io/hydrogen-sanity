import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {ActionFunction, json, LoaderFunctionArgs, redirect} from '@shopify/remix-oxygen'

// A `POST` request to this route will exit preview mode
export const action: ActionFunction = async ({context, request}) => {
  if (request.method !== 'POST') {
    return json({message: 'Method not allowed'}, 405)
  }

  await context.session.unset('projectId')

  return redirect('/', {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  })
}

// A `GET` request to this route will enter preview mode
export const loader = async ({context, request}: LoaderFunctionArgs) => {
  const {env, sanity} = context

  if (!env.SANITY_API_TOKEN) {
    throw new Response('Preview mode missing token', {status: 401})
  }

  const clientWithToken = sanity.client.withConfig({
    token: env.SANITY_API_TOKEN,
  })

  const {isValid, redirectTo = '/'} = await validatePreviewUrl(clientWithToken, request.url)

  if (!isValid) {
    throw new Response('Invalid secret', {status: 401})
  }

  await context.session.set('projectId', env.SANITY_PROJECT_ID)

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await context.session.commit(),
    },
  })
}
