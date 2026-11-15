import {Form, isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration} from 'react-router'
import {sanityContext} from 'react-router-sanity'
import {SanityLive} from 'react-router-sanity/live'
import {usePreview} from 'react-router-sanity/preview'
import {VisualEditing} from 'react-router-sanity/visual-editing'

import type {Route} from './+types/root'
import {sanityMiddleware} from './lib/sanity.server'

export const middleware: Route.MiddlewareFunction[] = [sanityMiddleware]

export function loader({context}: Route.LoaderArgs) {
  return {sanity: context.get(sanityContext).getRootData()}
}

export function Layout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const preview = usePreview()
  return (
    <>
      {preview.enabled ? (
        <Form method="post" action="/api/preview" data-testid="exit-preview">
          <span>Preview: {JSON.stringify(preview.perspective)}</span> <button type="submit">Exit preview</button>
        </Form>
      ) : null}
      <Outlet />
      <VisualEditing enabled={preview.enabled} />
      <SanityLive />
    </>
  )
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Unexpected error'
  return (
    <main>
      <h1>{message}</h1>
    </main>
  )
}
