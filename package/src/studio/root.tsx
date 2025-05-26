import {useNonce} from '@shopify/hydrogen'
import {lazy, type ReactElement, Suspense} from 'react'

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const Studio = typeof document === 'undefined' ? () => <></> : lazy(() => import('./Studio.client'))

export function Layout(): ReactElement {
  const nonce = useNonce()

  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="same-origin" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex" />
        <script
          src="https://core.sanity-cdn.com/bridge.js"
          async
          type="module"
          data-sanity-core
          nonce={nonce}
        />
      </head>
      <body>
        <Suspense>
          <Studio />
        </Suspense>
        <style nonce={nonce}>
          {`
html,body {
  height: 100vh;
  max-height: 100dvh;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  overflow: auto;
  margin: unset;
}
          `}
        </style>
      </body>
    </html>
  )
}
