# hydrogen-sanity

> **Warning**
> 
> Please be advised that `hydrogen-sanity` is still under development and available in pre-release. This package could change before it's officially released, so check back for updates and please provide any feedback you might have here.

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/)

**Features:**

- Cacheable queries to Sanity APICDN
- Client-side live real-time preview using an API token

> **Note**
> 
> Using this package isn't strictly required for working with Sanity in a Hydrogen storefront. If you'd like to use `@sanity/client` directly, see [Using `@sanity/client` directly](#using-sanityclient-directly) below.

## Installation

```sh
npm install hydrogen-sanity@beta
```

```sh
yarn add hydrogen-sanity@beta
```

```sh
pnpm install hydrogen-sanity@beta
```

## Usage

Update the server file to include the Sanity client:

```ts
// ./server.ts

// ...all other imports
import {createSanityClient, PreviewSession} from 'hydrogen-sanity';

// Inside the default export
export default () => {

  // 1. Add check for Preview Session
  const [cache, session, previewSession] = await Promise.all([
    caches.open('hydrogen'),
    HydrogenSession.init(request, [env.SESSION_SECRET]),
    // 👇 Add preview session
    PreviewSession.init(request, [env.SESSION_SECRET]),
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
          }
        : undefined,
    // Pass configuration options for Sanity client
    config: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      apiVersion: env.SANITY_API_VERSION ?? '2023-03-30',
      useCdn: process.env.NODE_ENV === 'production',
    },
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
import {Preview, type PreviewData, isPreviewModeEnabled} from 'hydrogen-sanity'

export async function loader({context}: LoaderArgs) {
  const preview: PreviewData | undefined = isPreviewModeEnabled(context.sanity.preview)
    ? {
        projectId: context.sanity.preview.projectId,
        dataset: context.sanity.preview.dataset,
        token: context.sanity.preview.token,
      }
    : undefined

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
        {/* 👇 Wrap <Outlet /> in Preview component */}
        <Preview preview={preview}>
          <Outlet />
        </Preview>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

You can also pass a `ReactNode` to render a loading indicator or adjust the default message:

```tsx
import {PreviewLoading} from '~/components/PreviewLoading';

// pass a string or your own React component to show while data is loading
<Preview preview={preview} fallback={<PreviewLoading />}>
```

Next, for any route that needs to render a preview, wrap it in a `Preview` component which re-runs the same query client-side but will render draft content in place of published content, if it exists. Updating in real-time as changes are streamed in.

The `usePreview` hook conditionally renders the preview component if the preview session is found, otherwise, it renders the default component.

```tsx
// Any route file, such as ./app/routes/index.tsx

// ...all other imports
import {usePreviewComponent, usePreviewContext} from 'hydrogen-sanity'

// ...all other exports like `loader` and `meta`
// Tip: In preview mode, pass "query" and "params" from the loader to the component

// Default export where content is rendered
export default function Index() {
  // Get initial data
  const {homepage} = useLoaderData<typeof loader>()
  // Conditionally render preview-enabled component (see below)
  const Component = usePreviewComponent(Route, Preview)

  return <Component homepage={homepage} />
}

// Renders Sanity content, whether powered by Preview or not
function Route({homepage}) {
  return <>{/* ...render homepage using data */}</>
}

// Fetches content client-side and renders live updates of draft content
function Preview(props) {
  const {usePreview} = usePreviewContext()!
  const homepage = usePreview(
    `*[_type == "page" && _id == $id][0]`,
    {id: 'home'},
    // the initial data from the loader, which
    // can help speed up loading
    props.homepage
  )

  return <Route homepage={homepage} />
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

## Limits

The real-time preview isn't optimized and comes with a configured limit of 3000 documents. You can experiment with larger datasets by configuring the hook with `documentLimit: <Integer>`. Be aware that this might significantly affect the preview performance.
You may use the `includeTypes` option to reduce the amount of documents and reduce the risk of hitting the `documentLimit`:

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
