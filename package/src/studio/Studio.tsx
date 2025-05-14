import {useNonce} from '@shopify/hydrogen'
import {lazy, type ReactElement, Suspense} from 'react'
import type {StudioProps} from 'sanity'

function StudioFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const StudioComponent =
  typeof document === 'undefined' ? StudioFallback : lazy(() => import('./Studio.client'))

const bridgeScriptUrl = 'https://core.sanity-cdn.com/bridge.js'

export function Studio(props: Pick<StudioProps, 'basePath'>): ReactElement {
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
          <StudioComponent {...props} />
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
