# hydrogen-sanity

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/). Requires `@shopify/hydrogen >= 2023.7.0`.

- [hydrogen-sanity](#hydrogen-sanity)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Satisfy TypeScript](#satisfy-typescript)
  - [Interacting with Sanity data](#interacting-with-sanity-data)
    - [Preferred: Cached fetches using `loadQuery`](#preferred-cached-fetches-using-loadquery)
    - [`loadQuery` Request Options](#loadquery-request-options)
    - [Alternatively: Using `client` directly](#alternatively-using-client-directly)
  - [Visual Editing](#visual-editing)
    - [Enabling preview mode](#enabling-preview-mode)
    - [Setup CORS for front-end domains](#setup-cors-for-front-end-domains)
    - [Modify Content Security Policy for Studio domains](#modify-content-security-policy-for-studio-domains)
    - [Setup Presentation Tool](#setup-presentation-tool)
  - [Using `@sanity/client` instead of hydrogen-sanity](#using-sanityclient-instead-of-hydrogen-sanity)
- [Migrate to v4 from v3](#migrate-to-v4-from-v3)
  - [License](#license)
  - [Develop \& test](#develop--test)
    - [Release new version](#release-new-version)

**Features:**

- Cacheable queries to [Sanity API CDN](https://www.sanity.io/docs/api-cdn)
- Interactive live preview with [Visual Editing](https://www.sanity.io/docs/loaders-and-overlays)

> **Note**
>
> Using this package isn't strictly required for working with Sanity in a Hydrogen storefront. If you'd like to use `@sanity/react-loader` and/or `@sanity/client` directly, see [Using `@sanity/client` directly](#using-sanityclient-directly) below.

## Installation

```sh
npm install hydrogen-sanity
```

```sh
yarn add hydrogen-sanity
```

```sh
pnpm install hydrogen-sanity
```

## Usage

Update the server file to include the Sanity Loader, and optionally, configure the preview mode if you plan to setup Visual Editing

```ts
// ./server.ts

// ...all other imports
// Add imports for Sanity Loader and Preview Session
import {createSanityLoader} from 'hydrogen-sanity'

// Inside the default export
export default () => {
  // ... Leave all other functions like the storefront client as-is

  // 1. Configure the Sanity Loader and preview mode
  const sanity = createSanityLoader({
    // Required:
    cache,
    waitUntil,
    // Required:
    // Pass configuration options for Sanity client
    config: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      apiVersion: env.SANITY_API_VERSION ?? '2023-03-30',
      useCdn: process.env.NODE_ENV === 'production',
    },
    // Optionally, set a global default cache strategy, defaults to CacheLong
    // strategy: CacheShort() | null,
    // Optionally, enable Visual Editing
    // See "Visual Editing" section below to setup the preview route
    preview:
      session.get('projectId') === env.SANITY_PROJECT_ID
        ? {token: env.SANITY_API_TOKEN, studioUrl: 'http://localhost:3333'}
        : undefined,
  })

  // 2. Make Sanity available to all action and loader contexts
  const handleRequest = createRequestHandler({
    // ...other settings
    getLoadContext: () => ({
      // ...other providers
      sanity,
    }),
  })
}
```

Update your environment variables with settings from your Sanity project.

- Copy these from [sanity.io/manage](https://sanity.io/manage)
- or run `npx sanity@latest init --env` to fill the minimum required values from a new or existing project

```sh
# Project ID
SANITY_PROJECT_ID=""
# Dataset name
SANITY_DATASET=""
# (Optional) Sanity API version
SANITY_API_VERSION=""
# Sanity token to authenticate requests in "preview" mode
# must have `viewer` role or higher access
# Create in sanity.io/manage
SANITY_API_TOKEN=""
```

### Satisfy TypeScript

Update the environment variables in `Env` and `AppLoadContext` to include the Sanity configuration:

```ts
// ./remix.env.d.ts
import type {Sanity} from 'hydrogen-sanity'

declare global {
  // ...other Types

  interface Env {
    // ...other variables
    SANITY_PROJECT_ID: string
    SANITY_DATASET: string
    SANITY_API_VERSION: string
    SANITY_API_TOKEN: string
  }
}

declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    // ...other Types
    sanity: Sanity
  }
}
```

## Interacting with Sanity data

### Preferred: Cached fetches using `loadQuery`

Query Sanity's API and use Hydrogen's cache to store the response (defaults to `CacheLong` caching strategy).

`loadQuery` will not implement Hydrogen's caching when:

- in preview mode or
- when the Sanity Client config for `useCdn` is false or
- when the `strategy` option is set to `null`.

Learn more about configuring [caching in Hydrogen on the Shopify documentation](https://shopify.dev/docs/custom-storefronts/hydrogen/caching).

```ts
export async function loader({context, params}: LoaderFunctionArgs) {
  const query = `*[_type == "page" && _id == $id][0]`
  const params = {id: 'home'}
  const initial = await context.sanity.loadQuery(query, params)

  return json({initial})
}
```

### `loadQuery` Request Options

If you need to pass any additional options to the request provide `queryOptions` like so:

```ts
const page = await context.sanity.loadQuery<HomePage>(query, params, {
  // These additional options will be passed to sanity.loadQuery
  queryOptions: {
    tag: 'home',
    headers: {
      'Accept-Encoding': 'br, gzip, *',
    },
  },
  // Optionally customize the cache strategy for this request
  // strategy: CacheShort(),
  // Or disable caching for this request
  // strategy: null,
})
```

### Alternatively: Using `client` directly

The Sanity Client is also configured in context, but will not return data in the same shape as `loadQuery`. It is recommended to use `loadQuery` for data fetching.

Sanity Client can be used for mutations within actions, for example:

```ts
export async function action({context, request}: ActionFunctionArgs) {
  if (!isAuthenticated(request)) {
    return redirect('/login')
  }

  return context.sanity
    .withConfig({
      token: context.env.SANITY_WRITE_TOKEN,
    })
    .client.create({
      _type: 'comment',
      text: request.body.get('text'),
    })
}
```

## Visual Editing

Enable real-time, interactive live preview inside the Presentation Tool of your Sanity Studio.

First set up your root route to enable preview mode across the entire application, if the preview session is active:

```tsx
// ./app/root.tsx

// ...other imports
import {VisualEditing} from '@sanity/visual-editing/remix'

export async function loader({context}: LoaderArgs) {
  return json({
    // ... other loader data
    preview: context.sanity.preview,
  })
}

export default function App() {
  const {preview, ...data} = useLoaderData<typeof loader>()

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        {preview ? <VisualEditing /> : null}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

This Visual Editing component will trigger incremental updates to draft documents from the server for users with a valid preview session. [Duplicate its source](https://github.com/sanity-io/visual-editing/blob/main/packages/visual-editing/src/remix/VisualEditing.tsx) into your own project if you wish to customize its behavior.

These updates are faster when your initial server-side content is passed through an optional `useQuery` hook.

```tsx
// Any route file, such as ./app/routes/index.tsx

// ...all other imports
import {useQuery} from '@sanity/react-loader'

export async function loader({context, params}: LoaderArgs) {
  const query = `*[_type == "page" && _id == $id][0]`
  const params = {id: 'home'}
  const initial = await context.sanity.loadQuery(query, params)

  return json({initial, query, params})
}

// Default export where content is rendered
export default function Index() {
  // Get initial data, passing it as snapshot to render preview...
  const {initial, query, params} = useLoaderData<typeof loader>()
  // Optional, pass query, params and initial data to useQuery for faster updates
  const {loading, data} = useQuery(query, params, initial)

  return loading ? <div>Loading</div> : <Page page={data} />
}
```

### Enabling preview mode

For users to enter preview mode, they will need to visit a route that performs some authentication and then writes to the session.

`hydrogen-sanity` comes with a preconfigured route for this purpose. It checks the value of a secret in the URL used by Presentation Tool - and if valid - writes the `projectId` to the Hydrogen session.

Add this route to your project like below, or view the source to copy and modify it in your project.

```tsx
// ./app/routes/resource.preview.ts

import {previewRoute} from 'hydrogen-sanity'

export const {loader} = previewRoute

// Optionally, export the supplied action which will disable preview mode when POSTed to
// export const {action, loader} = previewRoute
```

### Setup CORS for front-end domains

If your Sanity Studio is not embedded in your Hydrogen App, you will need to add a CORS origin to your project for every URL where your app is hosted or running in development.

Add `http://localhost:3000` to the CORS origins in your Sanity project settings at [sanity.io/manage](https://sanity.io/manage).

### Modify Content Security Policy for Studio domains

You may receive errors in the console due to Content Security Policy (CSP) restrictions due to the default `frame-ancestors` configuration. Modify `entry.server.tsx` to allow any URL that the Studio runs on to display the app in an Iframe.

```ts
// ./app/entry.server.tsx

// Replace this line
// responseHeaders.set('Content-Security-Policy', header);

// With this
const safeFrameHeader = header.replace(
  'frame-ancestors none',
  'frame-ancestors http://localhost:3333'
)
responseHeaders.set('Content-Security-Policy', safeFrameHeader)
```

### Setup Presentation Tool

Now in your Sanity Studio config, import the Presentation tool with the Preview URL set to the preview route you created.

```ts
// ./sanity.config.ts

// Add this import
import {presentationTool} from 'sanity/presentation'

export default defineConfig({
  // ...all other settings

  plugins: [
    presentationTool({
      previewUrl: {previewMode: {enable: 'http://localhost:3000/resource/preview'}},
    }),
    // ..all other plugins
  ],
})
```

You should now be able to view your Hydrogen app in the Presentation Tool, click to edit any Sanity content and see live updates as you make changes.

## Using `@sanity/client` instead of hydrogen-sanity

For whatever reason, if you choose not to use `hydrogen-sanity` you could still configure `@sanity/react-loader` or `@sanity/client` to get Sanity content into your Hydrogen storefront.

The following example configures Sanity Client.

```ts
// ./server.ts

// ...all other imports
import {createClient} from '@sanity/client';

export default {
  // ... all other functions

  // Create the Sanity Client
  const sanity = createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: env.SANITY_API_VERSION ?? '2023-03-30',
    useCdn: process.env.NODE_ENV === 'production',
  });

  // Pass it along to every request by
  // adding it to `handleRequest`
  const handleRequest = createRequestHandler({
    // ...other settings
    getLoadContext: () => ({
      // ...other context items
      sanity
    }),
  });
}
```

Then, in your loaders and actions you'll have access to Sanity Client in context:

```ts
export async function loader({context, params}: LoaderArgs) {
  const homepage = await context.sanity.fetch(`*[_type == "page" && _id == $id][0]`, {id: 'home'})

  return json({homepage})
}
```

# Migrate to v4 from v3

1. Swap `createSanityClient` for `createSanityLoader`

The new function will still return a client – useful for mutations when supplied with a write token. But primarily it will now return a configured [Sanity React Loader](https://www.sanity.io/docs/react-loader) which is the new recommendation for performing queries that will take advantage of Visual Editing

```diff
// ./server.ts

- import {createSanityClient} from 'hydrogen-sanity';
+ import {createSanityLoader} from 'hydrogen-sanity';
```

1. Update `query` data fetches to `loadQuery`.

The return type of `loadQuery` is different from Sanity Client's `fetch`, with the returned content is inside a `data` attribute. The recommendation for Hydrogen/Remix applications is to name this response `initial` and return it in its entirety in the loader.

```diff
./app/routes/products.$handle.tsx

Replace any usage of `query` with `loadQuery`
Note the different shape for arguments and return value
- const page = await sanity.query<SanityDocument>({query, params, cache, queryOptions})
+ const initial = await sanity.loadQuery<SanityDocument>(query, params, {strategy, queryOptions})

Replace any Sanity Client fetches
- const page = await sanity.client.fetch<SanityDocument>(query, params)
+ const initial = await sanity.loadQuery<SanityDocument>(query, params)

- return json({page})
+ return json({query, params, initial})
```

1. Then in the default export, pass this initial object to the `useQuery` hook imported from React Loader.

`useQuery` alone will not rerender the component with preview content. For this, you'll need to add a new component to the root.

```tsx
// ./app/routes/products.$handle.tsx

import {useQuery} from '@sanity/react-loader'

export default function Route() {
  const {query, params, initial} = useLoaderData()
  const {data, loading} = useQuery(query, params, initial)

  return loading ? <div>Loading</div> : <Product product={data} />
}
```

4. Change imports in `root.tsx`

The Sanity Visual Editing package exports a ready-made function for Remix to provide live updates to all `useQuery` hooks throughout the application. It is designed to only run when the app is displayed inside an iframe.

Update your imports:

```diff
// ./root.tsx

- import {PreviewProvider, getPreview} from 'hydrogen-sanity'
+ import {VisualEditing} from '@sanity/visual-editing/remix'
```

Update root loader and default export to remove the old `PreviewProvider` and replace it with the conditionally imported `VisualEditing` component:

```tsx
// ./root.tsx

// Preview config no longer needs to be returned from the Loader
export async function loader({context}: LoaderArgs) {
  return json({
    // ... other loader data
    // Return a boolean for if the app is in preview mode
    preview: !!context.sanity.preview,
  })
}

// Remove the Preview Provider
export default function App() {
  const {preview, ...data} = useLoaderData<typeof loader>()

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
    <body>
      {/* Remove the PreviewProvider wrapper */}
      <PreviewProvider {...preview}>
        <Outlet />
      </Preview>
      {/* Replace with VisualEditing */}
      <Outlet />
      {preview ? <VisualEditing /> : null}
      <ScrollRestoration />
      <Scripts />
    </body>
    </html>
  )
}
```

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>

## Develop & test

This plugin uses [@sanity/pkg-utils](https://github.com/sanity-io/pkg-utils)
with default configuration for build & watch scripts.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/hydrogen-sanity/actions/workflows/main.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.
