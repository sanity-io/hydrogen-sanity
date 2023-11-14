# hydrogen-sanity

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/). Requires `@shopify/hydrogen >= 2023.7.0`.

**Features:**

- Cacheable queries to Sanity APICDN
- Client-side live real-time preview using an API token

> **Note**
>
> Using this package isn't strictly required for working with Sanity in a Hydrogen storefront. If you'd like to use `@sanity/client` directly, see [Using `@sanity/client` directly](#using-sanityclient-directly) below.

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

Update the server file to include the Sanity client:

```ts
// ./server.ts

// ...all other imports
import {createSanityClient} from 'hydrogen-sanity';

// Inside the default export
export default () => {

  // 1. Add check for Preview Session
  const secrets = [env.SESSION_SECRET];
  const [cache, session, previewSession] = await Promise.all([
    caches.open('hydrogen'),
    HydrogenSession.init(request, secrets),
    // 👇 Add preview session
    (async function createPreviewSession() {
        const storage = createCookieSessionStorage({
          cookie: {
            name: '__preview',
            httpOnly: true,
            sameSite: true,
            secrets,
          },
        });

        const session = await storage.getSession(request.headers.get("Cookie"));

        return new HydrogenSession(storage, session);
      })(),
  ]);

  // Leave all other functions like the storefront client as-is
  const {storefront} = createStorefrontClient({ ... })

  // 2. Add the Sanity client
  const sanity = createSanityClient({
    cache,
    waitUntil,
    // Optionally, pass session and token to enable live-preview
    preview:
      env.SANITY_PREVIEW_SECRET && env.SANITY_API_TOKEN
        ? {
            session: previewSession,
            token: env.SANITY_API_TOKEN,
            // Optionally, provide an alternative to the default `previewDrafts` perspective when in preview mode
            // See https://www.sanity.io/docs/perspectives
            // perspective: "raw"
          }
        : undefined,
    // Pass configuration options for Sanity client
    config: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      apiVersion: env.SANITY_API_VERSION ?? '2023-03-30',
      useCdn: process.env.NODE_ENV === 'production',
    }
  });

  // 3. Add Sanity client to the request handler inside getLoadContext
  const handleRequest = createRequestHandler({
    // ...other settings
    getLoadContext: () => ({
      // ...other providers
      sanity,
    }),
  });
}
```

Update your environment variables with settings from your Sanity project. Copy these from https://www.sanity.io/manage or run `npx sanity@latest init --env` to fill the minimum required values from a new or existing project.

```sh
# Project ID
SANITY_PROJECT_ID=""
# Dataset name
SANITY_DATASET=""
# (Optional) Sanity API version
SANITY_API_VERSION=""
# Sanity token to authenticate requests in "preview" mode,
# with `viewer` role or higher access
# https://www.sanity.io/docs/http-auth
SANITY_API_TOKEN=""
# Secret for authenticating preview mode
SANITY_PREVIEW_SECRET=""
```

### Satisfy TypeScript

Update the environment variables in `Env`

```ts
// ./remix.env.d.ts
import type {Sanity} from 'hydrogen-sanity'

declare global {
  // ...other Types

  interface Env {
    // ...other variables
    SANITY_PREVIEW_SECRET: string
    SANITY_API_TOKEN: string
    SANITY_PROJECT_ID: string
    SANITY_DATASET: string
    SANITY_API_VERSION: string
  }
}

declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    // ...other Types
    sanity: Sanity
  }
}
```

### Fetching Sanity data with `query`

Query Sanity API and cache the response (defaults to `CacheLong` caching strategy):

```ts
export async function loader({context, params}: LoaderArgs) {
  const homepage = await context.sanity.query({
    query: `*[_type == "page" && _id == $id][0]`,
    params: {
      id: 'home',
    },
    // optionally pass a caching strategy
    // cache: CacheShort()
  })

  return json({
    homepage,
  })
}
```

To use other client methods, or to use `fetch` without caching, the Sanity client is also available:

```ts
export async function loader({context, params}: LoaderArgs) {
  const homepage = await context.sanity.client.fetch(
    `*[_type == "page" && _id == $id][0]`,
    {id: 'home'}
  );

  return json({
    homepage,
  });
```

### Live preview

Enable real-time, live preview by streaming dataset updates to the browser.

First setup your root route to enable preview mode across the entire application, if the preview session is found:

```tsx
// ./app/root.tsx

// ...other imports
import {PreviewProvider, getPreview} from 'hydrogen-sanity'

export async function loader({context}: LoaderArgs) {
  const preview = getPreview(context)

  return json({
    // ... other loader data
    preview,
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
        {/* 👇 Wrap <Outlet /> in PreviewProvider component */}
        <PreviewProvider {...preview}>
          <Outlet />
        </Preview>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

`PreviewProvider` wraps the `LiveQueryProvider` component of `@sanity/preview-kit` - props passed to `PreviewProvider` will be passed to `LiveQueryProvider`. For more information, see the [`@sanity/preview-kit` documentation](https://github.com/sanity-io/preview-kit).

By default, `PreviewProvider` will passthrough rendering to its children if you don't provide a fallback; however you can also pass a `ReactNode` to render a loading indicator or message:

```tsx
import {PreviewLoading} from '~/components/PreviewLoading';

// (Optional) pass a string or your own React component to show while data is loading
<PreviewProvider {...preview} fallback={<PreviewLoading />}>
```

Next, for any route that needs to render a preview, wrap it in a `SanityPreview` component which re-runs the same query client-side but will render draft content in place of published content, if it exists. Updating in real-time as changes are streamed in.

The component will be rendered with live preview if the preview session is found, otherwise, it renders the component with static content.

```tsx
// Any route file, such as ./app/routes/index.tsx

// ...all other imports
import {SanityPreview} from 'hydrogen-sanity'

// ...all other exports like `loader` and `meta`
// Tip: In preview mode, pass "query" and "params" from the loader to the component

// Default export where content is rendered
export default function Index() {
  // Get initial data, passing it as snapshot to render preview...
  const {homepage} = useLoaderData<typeof loader>()

  // Render preview-enabled component, fetches
  // content client-side and renders live updates
  // of draft content
  return (
    <SanityPreview
      data={homepage}
      query={`*[_type == "page" && _id == $id][0]`}
      params={{id: 'home'}}
    >
      {(homepage) => <>{/* ...render homepage using data */}</>}
    </SanityPreview>
  )
}
```

### Entering preview mode

For users to enter preview mode, they will need to visit a route that sets a preview cookie. The logic of what routes should set the preview cookie is up to you, in this example, it checks if a parameter in the URL matches one of your environment variables on the server.

```tsx
// ./app/routes/api.preview.tsx
import {LoaderFunction, redirect} from '@shopify/remix-oxygen'

export const loader: LoaderFunction = async function ({request, context}) {
  const {env, sanity} = context
  const {searchParams} = new URL(request.url)

  if (
    !sanity.preview?.session ||
    !searchParams.has('secret') ||
    searchParams.get('secret') !== env.SANITY_PREVIEW_SECRET
  ) {
    throw new Response('Invalid secret', {
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  sanity.preview.session.set('projectId', env.SANITY_PROJECT_ID)

  return redirect(`/`, {
    status: 307,
    headers: {
      'Set-Cookie': await sanity.preview.session.commit(),
    },
  })
}
```

## Request Options

If you need to pass any additional options to the request, provide `queryOptions` like so:

```ts
const page = await context.sanity.query<HomePage>({
  query: HOME_PAGE_QUERY,
  cache,
  // These additional options will be passed to `sanity.fetch`
  queryOptions: {
    tag: 'home',
    headers: {
      'Accept-Encoding': 'br, gzip, *',
    },
  },
})
```

## Limits

The real-time preview comes with a configured limit of 3000 documents. You can experiment with larger datasets by configuring `cache.maxDocuments: <Integer>` in your `PreviewProvider`. Be aware that this might affect the preview performance.

You can also use the `cache.includeTypes` option to reduce the amount of documents and reduce the risk of hitting the document limit.

If you're a Sanity Enterprise user with Content Source Maps enabled, you can optimize further by enabling `turboSourceMap` which opts-in to a faster and smarter cache. It'll only listen for mutations on the documents that you are using in your queries, and apply the mutations to the cache in real-time.

## Using `@sanity/client` directly

For whatever reason, if you choose not to use `hydrogen-sanity` you can still use `@sanity/client` to get Sanity content into your Hydrogen storefront:

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

Then, in your loaders you'll have access to the client in the request context:

```ts
export async function loader({context, params}: LoaderArgs) {
  const homepage = await context.sanity.fetch(
    `*[_type == "page" && _id == $id][0]`,
    {id: 'home'}
  );

  return json({
    homepage,
  });
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
