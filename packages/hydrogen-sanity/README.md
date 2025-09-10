# hydrogen-sanity

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/). Requires `@shopify/hydrogen >= 2025.5.1`.

Learn more about [getting started with Sanity](https://www.sanity.io/docs/getting-started).

- [Installation](#installation)
  - [Add Vite plugin](#add-vite-plugin)
- [Usage](#usage)
  - [Satisfy TypeScript](#satisfy-typescript)
- [Interacting with Sanity data](#interacting-with-sanity-data)
  - [Recommended: Using `query` and `Query` together](#recommended-using-query-and-query-together)
  - [Alternative: Cached queries using `loadQuery`](#alternative-cached-queries-using-loadquery)
    - [Additional `loadQuery` options](#additional-loadquery-options)
  - [Alternative: Direct queries using `fetch`](#alternative-direct-queries-using-fetch)
  - [Alternative: Using `client` directly](#alternative-using-client-directly)
  - [Using Sanity TypeGen](#using-sanity-typegen)
- [Working with Images](#working-with-images)
- [Enable Visual Editing](#enable-visual-editing)
  - [Enabling preview mode](#enabling-preview-mode)
  - [Setup CORS for front-end domains](#setup-cors-for-front-end-domains)
  - [Modify storefront's Content Security Policy (CSP)](#modify-storefronts-content-security-policy-csp)
  - [Setup Presentation tool](#setup-presentation-tool)
  - [Troubleshooting](#troubleshooting)
- [Using `@sanity/client` instead of `hydrogen-sanity`](#using-sanityclient-instead-of-hydrogen-sanity)
- [Migration Guides](#migration-guides)
- [License](#license)
- [Develop \& test](#develop--test)
  - [Release new version](#release-new-version)

**Features:**

- TypeScript support with [Sanity TypeGen](https://www.sanity.io/docs/sanity-typegen).
- Intelligent data fetching with `query` method and `Query` component that automatically optimize based on preview mode.
- Cacheable queries to [Sanity API CDN](https://www.sanity.io/docs/api-cdn) with `loadQuery` and `fetch` methods.
- Interactive live preview with [Visual Editing](https://www.sanity.io/docs/loaders-and-overlays).

> [!TIP]
>
> If you'd prefer a self-paced course on how to use Sanity and Hydrogen, check out the [Sanity and Shopify with Hydrogen on Sanity Learn](https://www.sanity.io/learn/course/sanity-and-shopify-with-hydrogen).

> [!NOTE]
>
> Using this package isn't strictly required for working with Sanity in a Hydrogen storefront. If you'd like to use `@sanity/react-loader` and/or `@sanity/client` directly, see [Using `@sanity/client` directly](#using-sanityclient-directly) below.

## Installation

```sh
npm install hydrogen-sanity @sanity/client
```

```sh
yarn add hydrogen-sanity @sanity/client
```

```sh
pnpm install hydrogen-sanity @sanity/client
```

### Add Vite plugin

Add the Vite plugin to your `vite.config.ts`:

```ts
import {defineConfig} from 'vite'
import {hydrogen} from '@shopify/hydrogen/vite'
import {sanity} from 'hydrogen-sanity/vite'

export default defineConfig({
  plugins: [hydrogen(), sanity() /** ... */],
  // ... other config
})
```

## Usage

Create the Sanity context and pass it through to your application, and optionally, configure the preview mode if you plan to setup Visual Editing

> [!NOTE]
> The examples below are up-to-date as of `npm create @shopify/hydrogen@2025.5.1`

```ts
// ./lib/context.ts

// ...all other imports
import {createSanityContext} from 'hydrogen-sanity'

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  // ... Leave all other functions like the Hydrogen context as-is
  const waitUntil = executionContext.waitUntil.bind(executionContext)
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ])

  // 1. Configure the Sanity Loader and preview mode
  const sanity = await createSanityContext({
    request,

    // To use the Hydrogen cache for queries
    cache,
    waitUntil,

    // Sanity client configuration
    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || 'production',
      apiVersion: env.SANITY_API_VERSION || 'v2024-08-08',
      useCdn: process.env.NODE_ENV === 'production',
    },

    // You can also initialize a client and pass it instead
    // client: createClient({
    //   projectId: env.SANITY_PROJECT_ID,
    //   dataset: env.SANITY_DATASET,
    //   apiVersion: env.SANITY_API_VERSION,
    //   useCdn: process.env.NODE_ENV === 'production',
    // }),

    // Optionally, set a default cache strategy, defaults to `CacheLong`
    // strategy: CacheShort() | null,
  })

  // 2. Make Sanity available to loaders and actions in the request context
  return {
    ...hydrogenContext,
    sanity,
  }
}
```

Learn more about [Sanity's JavaScript client configuration](https://www.sanity.io/docs/js-client).

Update your environment variables with settings from your Sanity project.

- Copy these from [sanity.io/manage](https://sanity.io/manage).
- Or run `npx sanity@latest init --env` to fill the minimum required values from a new or existing project.

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
SANITY_PREVIEW_TOKEN=""
```

### Satisfy TypeScript

Update the environment variables in `Env` to include the ones you created above:

> [!NOTE]
> If you plan to reference any environment variables in the client bundle, say for your embedded Studio configuration, you must prefix them with either `PUBLIC_` or `SANITY_STUDIO_`

```ts
// ./env.d.ts

declare global {
  // ...other types

  interface Env extends HydrogenEnv {
    // ...other environment variables

    SANITY_PROJECT_ID: string
    SANITY_DATASET?: string
    SANITY_API_VERSION?: string
    SANITY_PREVIEW_TOKEN: string
  }
}
```

## Interacting with Sanity data

### Recommended: Using `query` and `Query` together

The `query` method and `Query` component work together to provide an optimized data fetching and rendering experience that automatically adapts based on your app's current mode:

- **In preview mode**: `query` uses `loadQuery` for loader integration, while `Query` renders with real-time updates via `useQuery`
- **In production**: `query` uses `fetch` for optimal performance, while `Query` renders static data directly

> [!TIP]
> You can use [Sanity TypeGen tooling](https://www.sanity.io/docs/sanity-typegen) to generate TypeScript definitions for your [GROQ](https://www.sanity.io/docs/groq) queries.

**Step 1: Fetch data in your loader with `query`**

```ts
export async function loader({context, params}: LoaderFunctionArgs) {
  const queryString = `*[_type == "page" && _id == $id][0]`
  const queryParams = {id: 'home'}
  const initial = await context.sanity.query(queryString, queryParams)

  return {initial}
}
```

**Step 2: Render with the `Query` component**

```tsx
import {Query} from 'hydrogen-sanity'

export default function HomePage({loaderData}: {loaderData: {initial: any}}) {
  const {initial} = loaderData

  return (
    <Query query={`*[_type == "page" && _id == $id][0]`} params={{id: 'home'}} options={initial}>
      {(data, encodeDataAttribute) => (
        <div>
          <h1 {...encodeDataAttribute?.('title')}>{data?.title}</h1>
          <p {...encodeDataAttribute?.('description')}>{data?.description}</p>
        </div>
      )}
    </Query>
  )
}
```

> [!NOTE]
> The `encodeDataAttribute` function is only available in preview mode and enables click-to-edit functionality. In production, it returns `undefined`.

**Advanced Options**

Both methods accept the same options as their underlying implementations:

```ts
// In your loader
const page = await context.sanity.query<HomePage>(queryString, params, {
  // Hydrogen caching options
  hydrogen: {
    cache: CacheShort(),
    debug: {displayName: 'query Homepage'},
  },
  // Sanity request options
  tag: 'home',
})

// In your component
<Query
  query={queryString}
  params={params}
  options={initial}
  fallback={<div>Loading...</div>} // React Suspense props
>
  {(data) => <YourComponent data={data} />}
</Query>
```

### Alternative: Cached queries using `loadQuery`

Query Sanity's API and use Hydrogen's cache to store the response (defaults to `CacheLong` caching strategy). While in preview mode, `loadQuery` automatically bypasses the cache.

> [!TIP]
> You can use [Sanity TypeGen tooling](https://www.sanity.io/docs/sanity-typegen) to generate TypeScript definitions for your [GROQ](https://www.sanity.io/docs/groq) queries.

Learn more about configuring [caching in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/caching).

Sanity queries appear in Hydrogen's [Subrequest Profiler](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/subrequest-profiler). By default, they're titled `Sanity query`. You can give your queries more descriptive titles by using the request option below.

```ts
export async function loader({context, params}: LoaderFunctionArgs) {
  const query = `*[_type == "page" && _id == $id][0]`
  const params = {id: 'home'}
  const initial = await context.sanity.loadQuery(query, params)

  return {initial}
}
```

#### Additional `loadQuery` options

If you need to pass any additional options to the request provide `queryOptions` like so:

```ts
const page = await context.sanity.loadQuery<HomePage>(query, params, {
  // Optionally customize the cache strategy for this request
  hydrogen: {
    cache: CacheShort(),
    // Or disable caching for this request
    // cache: CacheNone(),

    // If you'd like to add a custom display title that will
    // display in the subrequest profiler, you can pass that here:
    // debug: {
    //   displayName: 'query Homepage'
    // },

    // You can also pass a function do determine whether or not to cache the response
    // shouldCacheResult(value){
    //  return true
    // },
  },

  // ...as well as other request options
  // tag: 'home',
  // headers: {
  //   'Accept-Encoding': 'br, gzip, *',
  // },
})
```

> [!TIP]
> Learn more about [request tagging](https://www.sanity.io/docs/reference-api-request-tags).

### Alternative: Direct queries using `fetch`

For Sanity queries that don't need loader integration, there is a `fetch` method that also integrates with Hydrogen's cache:

```ts
export async function loader({context, params}: LoaderFunctionArgs) {
  const query = `*[_type == "page" && _id == $id][0]`
  const params = {id: 'home'}

  const page = await context.sanity.fetch<HomePage>(query, params, {
    hydrogen: {
      cache: CacheShort(),
      debug: {displayName: 'fetch Homepage'},
    },
    tag: 'home',
  })

  return {page}
}
```

### Alternative: Using `client` directly

The Sanity client (either instantiated from your configuration or passed through directly) is also available in your app's context. It is recommended to use `query` for data fetching; but the Sanity client can be used for mutations within actions, for example:

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

### Using Sanity TypeGen

If you are using TypeGen with `overloadClientMethods: true`, TypeGen uses [TypeScript declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to add type definitions for your GROQ queries:

```ts
// sanity.types.ts

// Query TypeMap
import '@sanity/client'
declare module '@sanity/client' {
  interface SanityQueries {
    // Each of your GROQ query strings will appear here as keys to their respective response types
  }
}
```

Now your queries will have automatic type inference:

```ts
import {defineQuery} from 'groq'

const HOMEPAGE_QUERY = defineQuery(`*[_id == "home"][0]`)

export async function loader({context, params}: LoaderFunctionArgs) {
  const params = {id: 'home'}
  const initial = await context.sanity.loadQuery(HOMEPAGE_QUERY, params)

  return {initial}
}
```

## Working with images

The `useImageUrl` hook provides a convenient way to generate optimized image URLs from Sanity image assets with the [image URL builder](https://www.sanity.io/docs/image-url).

```tsx
import {useImageUrl} from 'hydrogen-sanity'

function HeroBanner({hero}: {hero: {image: SanityImageSource}}) {
  const imageUrl = useImageUrl(hero.image)

  return (
    <div className="hero-banner">
      <img
        src={imageUrl.width(1200).height(600).format('auto').url()}
        alt="Hero banner"
        width={1200}
        height={600}
      />
    </div>
  )
}
```

## Enable visual editing

Enable real-time, interactive live preview inside the [Presentation tool](https://www.sanity.io/docs/presentation) of your Sanity Studio. `hydrogen-sanity` comes with a ready-to-use version of the `VisualEditing` component that's compatible with Hydrogen and Oxygen.

> [!NOTE]
>
> These instructions assume some familiarity with Sanity's Visual Editing concepts, like loaders and overlays. To learn more, please visit the [Visual Editing documentation](https://www.sanity.io/docs/introduction-to-visual-editing).

### Configure Preview Mode

For visual editing to work, you need to set up preview mode in your context configuration. First, initialize the preview session:

```ts
// ./lib/context.ts

// ...all other imports
import {createSanityContext} from 'hydrogen-sanity'
import {PreviewSession} from 'hydrogen-sanity/preview/session'
import {isPreviewEnabled} from 'hydrogen-sanity/preview'

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  // ... Leave all other functions like the Hydrogen context as-is
  const waitUntil = executionContext.waitUntil.bind(executionContext)
  const [cache, session, previewSession] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
    // Initialize the preview session
    PreviewSession.init(request, [env.SESSION_SECRET]),
  ])

  const sanity = await createSanityContext({
    request,
    cache,
    waitUntil,

    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || 'production',
      apiVersion: env.SANITY_API_VERSION || 'v2024-08-08',
      useCdn: process.env.NODE_ENV === 'production',

      // Enable stega encoding only when in preview mode
      stega: {
        enabled: isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession),
      },
    },

    // Preview configuration
    preview: {
      token: env.SANITY_PREVIEW_TOKEN,
      session: previewSession,
    },
  })

  return {
    ...hydrogenContext,
    sanity,
  }
}
```

### Add Visual Editing Component

Set up your root route to enable visual editing across the entire application when preview mode is active:

```tsx
// ./app/root.tsx

// ...other imports
import {usePreviewMode} from 'hydrogen-sanity/preview'
import {VisualEditing} from 'hydrogen-sanity/visual-editing'

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()
  const data = useRouteLoaderData<RootLoader>('root')
  const previewMode = usePreviewMode()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* ...rest of the root layout */}

        {/* Conditionally render `VisualEditing` component only when in preview mode */}
        {previewMode ? <VisualEditing action="/api/preview" /> : null}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

#### Visual Editing Configuration Options

The `VisualEditing` component provides flexible configuration for different data loading patterns:

**Server-Only Setup (default):**

```tsx
<VisualEditing /> // Overlays only with server revalidation
```

**With Client-Side Loaders (opt-in):**

```tsx
<VisualEditing liveMode /> // Enable live mode for real-time data sync via useQuery hooks
```

**Explicit Server-Only:**

```tsx
<VisualEditing /> // Default: overlays only, always use server revalidation
```

#### Individual Component Usage

For advanced use cases, you can use the individual components:

```tsx
import {Overlays, LiveMode} from 'hydrogen-sanity/visual-editing'

// Overlays only (server-only setups)
<Overlays action="/api/preview" />

// Live mode only (client-side data sync)
<LiveMode />

// Both (hybrid setups)
<Overlays action="/api/preview" />
<LiveMode />
```

This Visual Editing component provides a complete visual editing experience, including:

- **Context-aware behavior**: Auto-detects Studio vs standalone preview contexts
- **Real-time preview**: Updates content as you edit in Studio
- **Visual overlays**: Click-to-edit functionality with element highlighting
- **Perspective switching**: Draft/published content switching
- **Server revalidation**: Smart refresh logic for server-side data
- **Custom revalidation**: Customizable refresh logic for more control

### Enabling preview mode

For users to enter preview mode, they will need to visit a route that performs some authentication and then writes to the session.

`hydrogen-sanity` comes with a preconfigured route for this purpose. It checks the value of a secret in the URL used by Presentation tool - and if valid - writes the `projectId` to the session.

> [!NOTE]
>
> For visual editing overlays and click-to-edit functionality to work, you must configure `stega.enabled: true` in your Sanity client configuration.
>
> You can learn more about [Content Source Maps and working with stega-encoded strings](https://www.sanity.io/docs/stega).

Add this route to your project like below, or view the source to copy and modify it in your project.

```tsx
// ./app/routes/api.preview.ts

export {action, loader} from 'hydrogen-sanity/preview/route'
```

### Set up CORS for front-end domains

If your Sanity Studio is not embedded in your Hydrogen App, you will need to add a Cross-Origin Resource Sharing (CORS) origin to your project for every URL where your app is hosted or running in development.

Add `http://localhost:3000` to the CORS origins in your Sanity project settings at [sanity.io/manage](https://sanity.io/manage). Learn more about [CORS configuration in Sanity](https://www.sanity.io/docs/front-ends-and-cors).

### Modify storefront's Content Security Policy (CSP)

Since Sanity Studio's Presentation tool displays the storefront inside an iframe, you will need to adjust the Content Security Policy (CSP) in `entry.server.tsx`.

> [!TIP]
>
> Review Hydrogen's [content security policy documentation](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy) to ensure your storefront is secure.

```ts
// ./app/entry.server.tsx

// ...all other imports
import type {AppLoadContext, EntryContext} from 'react-router'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: AppLoadContext,
) {
  const projectId = context.env.SANITY_PROJECT_ID
  const studioHostname = context.env.SANITY_STUDIO_HOSTNAME || 'http://localhost:3333'
  const isPreviewEnabled = context.sanity.preview?.enabled

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    // If your storefront and Studio are on separate domains...
    // ...allow Sanity assets loaded from the CDN to be loaded in your storefront
    defaultSrc: ['https://cdn.sanity.io'],
    // ...allow Studio to load your storefront in Presentation's iframe
    frameAncestors: isPreviewEnabled ? [studioHostname] : [],

    // If you've embedded your Studio in your storefront...
    // ...allow Sanity assets to be loaded in your storefront and allow user avatars in Studio
    defaultSrc: ['https://cdn.sanity.io', 'https://lh3.googleusercontent.com'],
    // ...allow client-side requests for Studio to do realtime collaboration
    connectSrc: [`https://${projectId}.api.sanity.io`, `wss://${projectId}.api.sanity.io`],
    // ...allow embedded Studio to load storefront
    frameAncestors: [`'self'`],
  })

  // ...and the rest
}
```

### Set up Presentation tool

Now in your Sanity Studio config, import the Presentation tool with the Preview URL set to the preview route you created.

> [!TIP]
>
> Consult the [Visual Editing documentation](https://www.sanity.io/docs/introduction-to-visual-editing) for how to [configure the Presentation tool](https://www.sanity.io/docs/configuring-the-presentation-tool).

```ts
// ./sanity.config.ts

// Add this import
import {presentationTool} from 'sanity/presentation'

export default defineConfig({
  // ...all other settings

  plugins: [
    presentationTool({
      previewUrl: {
        // If you're hosting your storefront on a separate domain, you'll need to provide an `origin`:
        // origin: process.env.SANITY_STUDIO_STOREFRONT_ORIGIN
        previewMode: {
          // This path is relative to the origin above and should match the route in your storefront that you've setup above
          enable: '/api/preview',
        },
      },
    }),
    // ..all other plugins
  ],
})
```

You should now be able to view your Hydrogen app in the Presentation tool, click to edit any Sanity content and see live updates as you make changes.

> [!NOTE]
>
> If you're able to see Presentation working locally, but not when you've deployed your application, check that your session cookie is using `sameSite: 'none'` and `secure: true`.
>
> Since Presentation displays your site in an iframe, the session cookie by default won't be sent through. You can learn more about session cookie configuation in [MDN's documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value).

### Troubleshooting

Are you getting the following error when trying to load your storefront in the Presentation tool?

> Unable to connect to visual editing. Make sure you've setup '@sanity/visual-editing' correctly

Presentation will throw this error if it can't establish a connection to your storefront. Here are a few things to double-check in your setup to try and troubleshoot:

1. Confirm that you've provided `preview` configuration to the Sanity context.
2. Confirm that you've added the `VisualEditing` component to your root layout.
3. If you've followed the instructions above, the `VisualEditing` component will be conditionally rendered if the app has been successfully put into preview mode.
4. If you're using a session cookie, check your browser devtools and confirm that the cookie has been set as expected.
5. Since Presentation loads your storefront in an `iframe`, double check your cookie and CSP configuration.

## Using `@sanity/client` instead of `hydrogen-sanity`

If you choose not to use `hydrogen-sanity`, you can still configure [`@sanity/react-loader`](https://www.sanity.io/docs/react-loader) or [`@sanity/client`](https://www.sanity.io/docs/js-client) to get Sanity content into your Hydrogen storefront.

The following example configures Sanity Client and provides it in the request context.

```ts
// ./lib/context.ts

// ...all other imports
import {createClient} from '@sanity/client'

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  // ... all other functions
  const withCache = createWithCache({cache, waitUntil, request})

  // Create the Sanity Client
  const sanity = createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: env.SANITY_API_VERSION ?? 'v2025-02-19',
    useCdn: process.env.NODE_ENV === 'production',
  })

  // Pass it along to every request by
  // adding it to `handleRequest`
  return {
    ...hydrogenContext,

    sanity,
    withCache,
  }
}
```

Then, in your loaders and actions you'll have access to Sanity Client in context:

```ts
export async function loader({context, params}: LoaderArgs) {
  const {sanity} = context
  const homepage = await sanity.fetch(`*[_type == "page" && _id == $id][0]`, {id: 'home'})

  return {homepage}
}
```

To cache your query responses in Hydrogen, use the [`withCache` utility](https://shopify.dev/docs/custom-storefronts/hydrogen/caching/third-party#hydrogen-s-built-in-withcache-utility):

```ts
export async function loader({context, params}: LoaderArgs) {
  const {withCache, sanity} = context

  const homepage = await withCache('home', CacheLong(), () =>
    sanity.fetch(`*[_type == "page" && _id == $id][0]`, {id: 'home'}),
  )

  return {homepage}
}
```

## Migration Guides

- [From `v3` to `v4`](https://github.com/sanity-io/hydrogen-sanity/blob/main/package/MIGRATE-v3-to-v4.md)
- [From `v4` to `v5`](https://github.com/sanity-io/hydrogen-sanity/blob/main/package/MIGRATE-v4-to-v5.md)

> [!NOTE]
> **New in v5**: The `query` method and `Query` component are now the **recommended** approach for data fetching and rendering. These wrappers automatically choose the optimal strategy based on preview mode, providing better performance and developer experience. While `loadQuery` and `fetch` are still available as alternatives for granular control, the new wrappers should be your first choice.

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>

## Develop & test

This plugin uses [@sanity/pkg-utils](https://github.com/sanity-io/pkg-utils)
with default configuration for build & watch scripts.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/hydrogen-sanity/actions/workflows/main.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.
