import {createContentSecurityPolicy} from '@shopify/hydrogen'
import type {LoaderFunction} from '@shopify/remix-oxygen'
import type {ReactNode} from 'react'
import {renderToReadableStream} from 'react-dom/server'

function StudioApp(): ReactNode {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Studio</title>
      </head>
      <body>
        <div className="studio-container">
          <h1>Studio</h1>
          <div>Streaming React App</div>
          <h1>HEYYYY</h1>
        </div>
      </body>
    </html>
  )
}

export const loader: LoaderFunction = async ({request}) => {
  try {
    const {nonce, header: cspHeader, NonceProvider} = createContentSecurityPolicy()

    const stream = await renderToReadableStream(<StudioApp />, {
      // bootstrapScripts: [VirtualModule.url('studio')],

      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error)
      },
    })

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
