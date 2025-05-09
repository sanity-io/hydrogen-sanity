import {useNonce} from '@shopify/hydrogen'
import {lazy, type ReactElement, Suspense} from 'react'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function StudioAppFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const Studio =
  typeof document === 'undefined' ? StudioAppFallback : lazy(() => import('./StudioApp.client'))

const bridgeScriptUrl = 'https://core.sanity-cdn.com/bridge.js'

export function StudioApp(): ReactElement {
  const nonce = useNonce()

  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="same-origin" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex" />
        <script src={bridgeScriptUrl} async type="module" data-sanity-core nonce={nonce} />
      </head>
      <body>
        <Suspense>
          <Studio />
        </Suspense>
      </body>
    </html>
  )
}
