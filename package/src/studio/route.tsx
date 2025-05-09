import {createContentSecurityPolicy} from '@shopify/hydrogen'
import type {LoaderFunction} from '@shopify/remix-oxygen'
import {renderToReadableStream} from 'react-dom/server'

import * as VirtualModule from '../vite/vmod'
import {StudioApp} from './StudioApp'

export const loader: LoaderFunction = async ({request}) => {
  try {
    const {nonce, header: cspHeader, NonceProvider} = createContentSecurityPolicy()

    const stream = await renderToReadableStream(
      <NonceProvider>
        <StudioApp />
      </NonceProvider>,
      {
        nonce,
        bootstrapModules: [VirtualModule.url(VirtualModule.id('studio'))],
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
