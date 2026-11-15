# Setup

Read this when you add `react-router-sanity` to an app for the first time.

## Install

```sh
pnpm add react-router-sanity @sanity/client
```

## 1. Configure the middleware

```ts
// app/lib/sanity.server.ts
import {createClient} from '@sanity/client'
import {memoryCache} from 'react-router-sanity/cache'
import {createSanityMiddleware} from 'react-router-sanity/server'

const cache = memoryCache() // once per process; use webCache or kvCache on Workers

export const sanityMiddleware = createSanityMiddleware(() => ({
  client: createClient({
    projectId: process.env.SANITY_PROJECT_ID!,
    dataset: process.env.SANITY_DATASET!,
    apiVersion: '2026-11-01',
    useCdn: true,
  }),
  serverToken: process.env.SANITY_VIEWER_TOKEN, // Viewer role, never serialized
  studioUrl: process.env.SANITY_STUDIO_URL,
  preview: {sessionSecrets: [process.env.SANITY_PREVIEW_SECRET!]},
  cache: {store: cache},
}))
```

On Workers and Oxygen, read `env` from the router context in the callback:
`createSanityMiddleware(({context}) => ({...}))`. Pass `waitUntil: ctx.waitUntil` for background
cache writes.

## 2. Register it on the root route

```tsx
// app/root.tsx
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

export default function App() {
  const preview = usePreview()
  return (
    <>
      <Outlet />
      <VisualEditing enabled={preview.enabled} />
      <SanityLive />
    </>
  )
}
```

## 3. Add the preview route

```ts
// app/routes/api.preview.ts  →  route('api/preview', 'routes/api.preview.ts')
export {loader, action} from 'react-router-sanity/preview/route'
```

In Studio, set the Presentation `previewMode.enable` to `/api/preview`.

## 4. Query in a loader

```ts
import {defineQuery, sanityContext} from 'react-router-sanity'

const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{title}`)

export async function loader({context, params}: Route.LoaderArgs) {
  const {data, syncTags} = await context.get(sanityContext).fetch({query: PAGE_QUERY, params})
  return {page: data, syncTags}
}
```

## Hydrogen (2026.10+)

Add `sanityMiddleware` to the same root `middleware` array as the Hydrogen storefront middleware.
To share the app session, pass `preview: {session: (request) => createYourSession(request)}`. The
session must have the four methods of `PreviewSession`: `get`, `set`, `unset` and `commit`.
Unverified in this draft: the exact session class of the Hydrogen 2026.10 template. The
`examples/hydrogen` app (not built yet) will pin it.

## Environment variables

| Variable                | Required | Use                                       |
| ----------------------- | -------- | ----------------------------------------- |
| `SANITY_PROJECT_ID`     | yes      | Project                                   |
| `SANITY_DATASET`        | yes      | Dataset                                   |
| `SANITY_PREVIEW_SECRET` | preview  | Signs the preview cookie                  |
| `SANITY_VIEWER_TOKEN`   | preview  | Reads drafts on the server                |
| `SANITY_STUDIO_URL`     | preview  | Stega and click-to-edit                   |
| `SANITY_LIVE_SECRET`    | live     | Signs Sync Tag Invalidate Function calls  |
