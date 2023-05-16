# hydrogen-sanity

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/)

**Features:**

- Cacheable queries to Sanity APICDN
- Client-side live real-time preview using an API token

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

Update your environment variables with settings from your Sanity project. Copy these from sanity.io/manage or run `npx sanity@latest init --env` to fill the minimum required values from a new or existing project.

```env
SANITY_PREVIEW_SECRET
SANITY_API_TOKEN
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_API_VERSION
```

### Satisfy TypeScript

Update the environment variables in `Env`

```ts
// ./remix.env.d.ts

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
    query: `*[_type == "home"][0]`,
    // optionally pass caching strategy
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
  const homepage = await context.sanity.client.fetch(`*[_type == "home"][0]`);

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
import {Preview, PreviewData, isPreviewModeEnabled} from 'hydrogen-sanity'

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
        <Preview preview={preview} fallback="Loading...">
          <Outlet />
        </Preview>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

Next, for any route that needs to render a preview, wrap it in a `Preview` component which re-runs the same query client-side but will render draft content in place of published content, if it exists. Updating in real-time as changes are streamed in.

The `usePreview` hook conditionally renders the preview component if the preview session is found, otherwise, it renders the default component.

```tsx
// Any route file, such as ./app/routes/index.tsx

// ...all other imports
import {usePreviewComponent} from 'hydrogen-sanity'

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
  const homepage = usePreview(`*[_type == "home"][0]`, undefined, props.homepage)

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

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>
