import {createContentSecurityPolicy} from '@shopify/hydrogen'
import type {LoaderFunction} from '@shopify/remix-oxygen'
import {Layout} from 'hydrogen-sanity/studio'
import {renderToReadableStream} from 'react-dom/server'
import {contentSecurityPolicy} from 'virtual:sanity/csp'
import routeClient from 'virtual:sanity/route-client'

export const loader: LoaderFunction = async ({request}) => {
  try {
    const {
      nonce,
      header: cspHeader,
      NonceProvider,
    } = createContentSecurityPolicy(contentSecurityPolicy)

    const stream = await renderToReadableStream(
      <NonceProvider>
        <Layout />
      </NonceProvider>,
      {
        nonce,
        bootstrapModules: [routeClient],
        signal: request.signal,
        onError(error) {
          console.error(error)
        },
      },
    )

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Security-Policy': cspHeader,
        Link: `<${routeClient}>; rel=modulepreload; as=script`,
      },
    })
  } catch (error) {
    console.error(error)
    return new Response('An unexpected error occurred', {status: 500})
  }
}
