# Migrating from v4 to v5

`hydrogen-sanity@^5` introduces opinionated best practices for Hydrogen + Sanity integration with intelligent data fetching patterns and enhanced visual editing capabilities.

## Breaking changes overview

### Major changes requiring action:

- **ESM-only**: Update Node.js version or switch to ESM imports (see [ESM compatibility](#esm-compatibility) below)
- **Async context creation**: Add `await` to `createSanityContext` calls
- **Peer dependencies**: Install `@sanity/client` and `groq` as direct dependencies
- **Deprecated APIs**: Replace `createSanityLoader` usage with `createSanityContext`
- **Client consolidation**: Remove `preview.previewClient` references - use main `client` instead

## Prerequisites

Before upgrading to `hydrogen-sanity@^5`, you must first [migrate your Hydrogen project to use React Router 7](https://hydrogen.shopify.dev/update/may-2025).

## ESM compatibility

`hydrogen-sanity@^5` is published as an ESM-only package. You have several options for compatibility:

### Option 1: Update Node.js version (Recommended)

If you're using Node.js ≥20.19 or ≥22.12, you can continue using CommonJS `require()` statements to load ESM modules. Update your `package.json` to ensure compatible Node.js versions:

```json
{
  "engines": {
    "node": ">=20.19 <22 || >=22.12"
  }
}
```

No code changes required - your existing CommonJS code will work:

```js
// ✅ This works with Node.js ≥20.19 or ≥22.12
const {createSanityContext} = require('hydrogen-sanity')
```

### Option 2: Switch to ESM imports

If you can't upgrade Node.js or prefer to use ESM imports:

```diff
// ❌ CommonJS (won't work with older Node.js)
- const {createSanityContext} = require('hydrogen-sanity')

// ✅ ESM imports
+ import {createSanityContext} from 'hydrogen-sanity'
```

You'll also need to ensure your project supports ESM by either:

- Adding `"type": "module"` to your `package.json`, or
- Using `.mjs` file extensions

### Option 3: Stay on v4

If you're unable to upgrade Node.js or switch to ESM, you can continue using `hydrogen-sanity@^4` which supports CommonJS.

## Install dependencies

### Install `@sanity/client`

`hydrogen-sanity@^5` treats `@sanity/client` as a peer dependency. Install it directly in your storefront:

```sh
npm install @sanity/client
```

Then replace all imports from `hydrogen-sanity/client` with `@sanity/client`.

### Install `groq`

`hydrogen-sanity@^5` treats `groq` as a peer dependency. If you use `groq` for Sanity TypeGen, install it directly in your storefront:

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

```diff
// ❌ v4 (synchronous)
- export function createAppLoadContext(request, env, executionContext) {
-   const sanity = createSanityContext({
+ // ✅ v5 (asynchronous)
+ export async function createAppLoadContext(request, env, executionContext) {
+   const sanity = await createSanityContext({
    request,
    cache,
    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
    },
  })

  return {
    sanity,
  }
}
```

**Required changes:**

1. Add `async` to your `createAppLoadContext` function
2. Add `await` before `createSanityContext` calls

The functionality remains the same once awaited.

### New `query` method and `Query` component (Recommended)

v5 introduces opinionated, intelligent wrappers that automatically choose the optimal data fetching and rendering strategy based on whether Sanity preview mode is active:

```ts
// Recommended: Use context.query() instead of loadQuery
const result = await context.sanity.query(query, params)
```

```tsx
// Recommended: Use Query component for rendering
import {Query} from 'hydrogen-sanity'
;<Query query={query} params={params} options={result}>
  {(data, encodeDataAttribute) => <h1 data-sanity={encodeDataAttribute('title')}>{data?.title}</h1>}
</Query>
```

These new methods automatically optimize based on Sanity preview mode session state:

- **When preview mode is active**: Dynamically imports `@sanity/react-loader` with `loadQuery` for loader integration + client-side `useQuery` for real-time Studio updates
- **When preview mode is inactive**: Uses lightweight direct client `fetch` for optimal performance and static rendering

### Alternative: New `fetch` method

v5 also introduces a `context.fetch()` method that provides direct client results without loader integration, offering an alternative for bundle optimization when preview mode is not needed:

```ts
// Using fetch (lighter, direct client results)
const result = await context.sanity.fetch(query, params)
```

### Alternative: Continue using `loadQuery` + `useQuery`

You can continue using the v4 method for granular control:

```ts
// Alternative: v4 method (still supported)
const result = await context.sanity.loadQuery(query, params)
```

> [!IMPORTANT]
> Live mode is now automatically detected when using `Query` components or `useQuery` hooks:
>
> ```tsx
> <VisualEditing action="/api/preview" /> // Automatically enables live mode when needed
> ```

All methods integrate with Hydrogen's caching system and automatically disable caching when Sanity preview mode is active.

## Sanity preview mode now uses a dedicated session

Sanity preview mode now uses its own dedicated session instead of sharing the storefront's session cookie. Replace the previous `preview.enabled` flag approach with the `PreviewSession` class exported from `hydrogen-sanity`:

```diff
// app/lib/context.ts

+ import {PreviewSession} from 'hydrogen-sanity/preview/session'

- const [cache, session] = await Promise.all([
+ const [cache, session, previewSession] = await Promise.all([
  caches.open('hydrogen'),
  AppSession.init(request, [env.SESSION_SECRET]),
+ // Initialize the preview session
+ PreviewSession.init(request, [env.SESSION_SECRET]),
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

+ preview: {
+   studioUrl: env.SANITY_STUDIO_ORIGIN,
+   token: env.SANITY_PREVIEW_TOKEN,
+   // pass your preview session
+   session: previewSession,
+ },
})
```

## Stega Configuration

`hydrogen-sanity` no longer automatically enables stega encoding when Sanity preview mode is active. You must explicitly configure stega in your client configuration if you want visual editing overlays.

```diff
+ import {isPreviewEnabled} from 'hydrogen-sanity/preview'

const sanity = await createSanityContext({
  client: {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
+   // You must explicitly configure stega for visual editing
+   stega: {
+     enabled: isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession),
+   },
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

```diff
// app/entry.server.tsx

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: AppLoadContext,
) {
+ const {SanityProvider} = context.sanity

  // ... CSP setup etc ...

  const body = await renderToReadableStream(
    <NonceProvider>
+     <SanityProvider>
        <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />
+     </SanityProvider>
    </NonceProvider>,
    // ... render options
  )

  // ... rest of function
}
```

### Update root.tsx

Add the client-side Sanity script to your root layout:

```diff
// app/root.tsx

+ import {Sanity} from 'hydrogen-sanity'
+ import {usePreviewMode} from 'hydrogen-sanity/preview'

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()
+ const previewMode = usePreviewMode()

  return (
    <html lang="en">
      {/* ... head content ... */}
      <body>
        {/* ... your existing content ... */}
        {children}

+       {/* Add Visual Editing support with automatic live mode detection */}
+       {previewMode ? <VisualEditing action="/api/preview" /> : null}

+       {/* Add Sanity client-side script */}
+       <Sanity nonce={nonce} />
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

// Recommended: Drop-in component with automatic live mode detection
<VisualEditing action="/api/preview" />

// Alternative: Individual components for advanced use cases
<Overlays action="/api/preview" />
<LiveMode />
```

### Live mode configuration

- **Live mode (recommended)**: Enable when using `Query` component or `useQuery` client loaders for real-time preview updates
- **Server-only**: Only use when doing pure server-side data fetching without client components

```tsx
// Default behavior - automatically detects when live mode is needed
<VisualEditing />
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

## Remove `createSanityLoader` usage

If you were using the deprecated `createSanityLoader` function, replace it with `createSanityContext`:

```diff
// ❌ v4 (deprecated)
- import {createSanityLoader} from 'hydrogen-sanity'
- const sanity = createSanityLoader({...})

// ✅ v5
+ import {createSanityContext} from 'hydrogen-sanity'
+ const sanity = await createSanityContext({...})
```

## Remove `preview.previewClient` references

The `preview.previewClient` has been removed. The main `client` is now automatically reconfigured with preview settings when Sanity preview mode is active:

```diff
// ❌ v4
- const result = sanity.preview?.previewClient?.fetch(query)

// ✅ v5
+ const result = sanity.client.fetch(query) // Automatically uses preview config when preview mode is active
```
