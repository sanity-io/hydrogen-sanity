import {createContentSecurityPolicy} from '@shopify/hydrogen'
import type {LoaderFunction} from '@shopify/remix-oxygen'
import {renderToReadableStream} from 'react-dom/server'
import {contentSecurityPolicy} from 'virtual:sanity/csp'
import {Studio} from 'virtual:sanity/studio'

export const loader: LoaderFunction = async ({request}) => {
  try {
    const {
      nonce,
      header: cspHeader,
      NonceProvider,
    } = createContentSecurityPolicy(contentSecurityPolicy)

    const stream = await renderToReadableStream(
      <NonceProvider>
        <Studio />
      </NonceProvider>,
      {
        nonce,
        bootstrapModules: ['/@id/__x00__virtual:sanity/entry.client'],
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
      },
    })
  } catch (error) {
    console.error(error)
    return new Response('An unexpected error occurred', {status: 500})
  }
}
