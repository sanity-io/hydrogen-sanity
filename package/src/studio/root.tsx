import {Links, Meta, Scripts, ScrollRestoration} from '@remix-run/react'
import {useNonce} from '@shopify/hydrogen'
import type {HeadersFunction, MetaFunction} from '@shopify/remix-oxygen'
import {lazy, type ReactNode, Suspense} from 'react'
import {ClientOnly} from 'remix-utils/client-only'

export const meta: MetaFunction = () => [
  {charSet: 'utf-8'},
  {
    name: 'viewport',
    content: 'width=device-width,initial-scale=1,viewport-fit=cover',
  },
  {
    name: 'referrer',
    content: 'same-origin',
  },
  {
    name: 'robots',
    content: 'noindex',
  },
]

/**
 * (Optional) Prevent Studio from being cached
 */
export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': 'no-store',
  }
}

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function SanityStudioFallback(): ReactNode {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 * @see https://remix.run/docs/en/1.14.3/guides/constraints#browser-only-code-on-the-server
 */
const SanityStudio =
  typeof document === 'undefined'
    ? SanityStudioFallback
    : lazy(
        () =>
          /**
           * `lazy` expects the component as the default export
           * @see https://react.dev/reference/react/lazy
           */
          import('./SanityStudio.client'),
      )

export default function StudioRoot() {
  const nonce = useNonce()

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <ClientOnly fallback={<SanityStudioFallback />}>
          {() => (
            <Suspense fallback={<SanityStudioFallback />}>
              <SanityStudio />
            </Suspense>
          )}
        </ClientOnly>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <style nonce={nonce}>
          {`body {
              margin: 0;
            }

            #sanity {
              height: 100vh;
              max-height: 100dvh;
              overscroll-behavior: none;
              -webkit-font-smoothing: antialiased;
              overflow: hidden;
            }`}
        </style>
      </body>
    </html>
  )
}
