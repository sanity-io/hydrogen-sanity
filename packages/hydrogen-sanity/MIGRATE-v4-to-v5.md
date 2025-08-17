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

const sanity = createSanityContext({
  request,
  cache,
  waitUntil,

  client: {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    useCdn: false,
  },

  preview: {
    studioUrl: env.SANITY_STUDIO_URL,
    token: env.SANITY_PREVIEW_TOKEN,
    // pass your preview session
    session: previewSession,
  },
})
```
