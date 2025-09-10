# Migrating from v4 to v5

## Prerequisites

Before upgrading to `hydrogen-sanity@^5`, you must first [migrate your Hydrogen project to use React Router 7](https://hydrogen.shopify.dev/update/may-2025).

## Install dependencies

### Install `@sanity/client`

`hydrogen-sanity@^5` treats `@sanity/client` as a peer dependency. Install it directly in your storefront:

```sh
npm install @sanity/client
```

Then replace all imports from `hydrogen-sanity/client` with `@sanity/client`.

### Install `groq` (if using TypeGen)

If you use `groq` for Sanity TypeGen, install it as a direct dependency:

```sh
npm install groq
```

Replace all imports from `hydrogen-sanity/groq` with `groq`.

## Add the Vite plugin

Add the `hydrogen-sanity/vite` plugin to your Vite configuration:

```ts
import {defineConfig} from 'vite'
import {hydrogen} from '@shopify/hydrogen/vite'
import {oxygen} from '@shopify/mini-oxygen/vite'
import {reactRouter} from '@react-router/dev/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import {sanity} from 'hydrogen-sanity/vite'

export default defineConfig({
  plugins: [hydrogen(), sanity(), oxygen(), reactRouter(), tsconfigPaths()],
  // ... rest of your config
})
```

## createSanityContext is now async

`createSanityContext` is now asynchronous, which is a breaking change that requires updating your context creation:

```ts
const sanity = await createSanityContext({
  request,
  cache,
  client: {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
  },
})
```

The functionality remains the same once awaited.

### New `query` method and `Query` component (Recommended)

v5 introduces intelligent wrappers that automatically choose the optimal data fetching and rendering strategy based on preview mode:

```ts
// Recommended: Use context.query() instead of loadQuery
const result = await context.sanity.query(query, params)
```

```tsx
// Recommended: Use Query component for rendering
import {Query} from 'hydrogen-sanity'
;<Query query={query} params={params} options={result}>
  {(data, encodeDataAttribute) => <h1 {...encodeDataAttribute?.('title')}>{data?.title}</h1>}
</Query>
```

These new methods automatically optimize based on context:

- **In preview mode**: Uses `loadQuery` for loader integration and client-side updates
- **In production**: Uses `fetch` for optimal performance and static rendering

### New `fetch` method

v5 also introduces a new `context.fetch()` method that provides direct client results without loader integration, offering an alternative for bundle optimization:

```ts
// Using fetch (lighter, direct client results)
const result = await context.sanity.fetch(query, params)
```

### Legacy method

You can continue using the v4 method:

```ts
// v4 method (still supported)
const result = await context.sanity.loadQuery(query, params)
```

All methods integrate with Hydrogen's caching system and automatically disable caching in preview mode.

## Preview mode now uses a dedicated session

Preview mode now uses its own dedicated session instead of sharing the storefront's session cookie. Replace the previous `preview.enabled` flag approach with the `PreviewSession` class exported from `hydrogen-sanity`:

```ts
// app/lib/context.ts

import {PreviewSession} from 'hydrogen-sanity/preview/session'

const [cache, session, previewSession] = await Promise.all([
  caches.open('hydrogen'),
  AppSession.init(request, [env.SESSION_SECRET]),
  // Initialize the preview session
  PreviewSession.init(request, [env.SESSION_SECRET]),
])

// then, when you're configuring the Sanity context

const sanity = await createSanityContext({
  request,
  cache,
  waitUntil,

  client: {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    useCdn: false,
  },

  preview: {
    studioUrl: env.SANITY_STUDIO_ORIGIN,
    token: env.SANITY_PREVIEW_TOKEN,
    // pass your preview session
    session: previewSession,
  },
})
```

## Stega Configuration

`hydrogen-sanity` no longer automatically enables stega encoding in preview mode. You must explicitly configure stega in your client configuration if you want visual editing overlays.

```ts
import {isPreviewEnabled} from 'hydrogen-sanity/preview'

const sanity = await createSanityContext({
  client: {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    // You must explicitly configure stega for visual editing
    stega: {
      enabled: isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession),
    },
  },
  preview: {
    token: env.SANITY_PREVIEW_TOKEN,
    session: previewSession,
  },
})
```

## Set up the Sanity provider

You now need to wrap your app with the Sanity provider to make Sanity context available to client-side hooks like `useImageUrl` and `usePreviewMode`.

### Update entry.server.tsx

Wrap your app with the Sanity provider in your server entry point:

```tsx
// app/entry.server.tsx

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: AppLoadContext,
) {
  const {SanityProvider} = context.sanity

  // ... CSP setup etc ...

  const body = await renderToReadableStream(
    <NonceProvider>
      <SanityProvider>
        <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
      </SanityProvider>
    </NonceProvider>,
    // ... render options
  )

  // ... rest of function
}
```

### Update root.tsx

Add the client-side Sanity script to your root layout:

```tsx
// app/root.tsx

import {Sanity} from 'hydrogen-sanity'
import {usePreviewMode} from 'hydrogen-sanity/preview'

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()
  const previewMode = usePreviewMode()

  return (
    <html lang="en">
      {/* ... head content ... */}
      <body>
        {/* ... your existing content ... */}
        {children}

        {/* Add Visual Editing support */}
        {previewMode ? <VisualEditing action="/api/preview" /> : null}

        {/* Add Sanity client-side script */}
        <Sanity nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

## Composable Visual Editing components

v5 introduces enhanced Visual Editing components with improved context detection. The Visual Editing functionality is now split into composable components:

```tsx
import {VisualEditing, Overlays, LiveMode} from 'hydrogen-sanity/visual-editing'

// Existing drop-in component (recommended)
<VisualEditing action="/api/preview" />

// Individual components for advanced use cases
<Overlays action="/api/preview" />
<LiveMode />
```

### Opt-In Live Mode

- **Server-Only (default)**: Always uses server revalidation for all content changes
- **Live Mode (opt-in)**: Only enable when you have active `useQuery` client loaders

```tsx
// Server-only mode (default)
<VisualEditing />

// Live mode (only when useQuery hooks are active)
<VisualEditing liveMode />
```

### Custom server-side revalidation

For more control, you can now customize refresh logic:

```tsx
function MyVisualEditing() {
  return (
    <VisualEditing
      action="/api/preview"
      refresh={(payload, refreshDefault, revalidator) => {
        // Handle cross-platform dependencies
        if (payload.source === 'mutation' && payload.document.shopifyProductId) {
          // Force server revalidation even when client loaders are active
          return new Promise<void>((resolve) => {
            revalidator.revalidate()
            const checkComplete = () => {
              if (revalidator.state === 'idle') resolve()
              else setTimeout(checkComplete, 100)
            }
            checkComplete()
          })
        }
        return refreshDefault() // Default behavior
      }}
    />
  )
}
```

## Consolidated client configuration

The `preview.client` has been removed in favor of a single, automatically configured client. The main `client` is now reconfigured with preview settings when preview mode is enabled.
