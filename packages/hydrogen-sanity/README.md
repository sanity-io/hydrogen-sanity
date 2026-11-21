# hydrogen-sanity

> [!TIP]
> **Upgrading from v7?** See the [migration guide](https://github.com/sanity-io/hydrogen-sanity/blob/main/packages/hydrogen-sanity/MIGRATE-v7-to-v8.md) for the move to Hydrogen 2026.10.

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/). Requires React `^19.2.3` and `@shopify/hydrogen` `~2026.10.0`. On Hydrogen 2026.4 and earlier, use `hydrogen-sanity` 7.x and its [README](https://github.com/sanity-io/hydrogen-sanity/blob/v7.1.0/packages/hydrogen-sanity/README.md).

Learn more about [getting started with Sanity](https://www.sanity.io/docs/getting-started).

**Features:**

- Drop-in preview mode handling with pre-built route and session management.
- Opinionated data fetching that automatically adapts to preview mode.
- Interactive live preview with automatic loader detection for [Visual Editing](https://www.sanity.io/docs/loaders-and-overlays) in Sanity's Presentation tool.
- An `Image` component and `getImageProps` that apply the Studio crop and hotspot, infer dimensions, and show a blur placeholder.
- TypeScript support with [Sanity TypeGen](https://www.sanity.io/docs/sanity-typegen).

> [!TIP]
>
> If you'd prefer a self-paced course on how to use Sanity and Hydrogen, check out the [Sanity and Shopify with Hydrogen on Sanity Learn](https://www.sanity.io/learn/course/sanity-and-shopify-with-hydrogen).

- [Installation](#installation)
  - [Add Vite plugin](#add-vite-plugin)
- [Usage](#usage)
  - [Satisfy TypeScript](#satisfy-typescript)
  - [Set up the Sanity provider](#set-up-the-sanity-provider)
- [Interacting with Sanity data](#interacting-with-sanity-data)
  - [Recommended: Using `query` and `Query` together](#recommended-using-query-and-query-together)
  - [Lower level: `loadQuery` in preview mode](#lower-level-loadquery-in-preview-mode)
  - [Alternative: Direct queries using `fetch`](#alternative-direct-queries-using-fetch)
  - [Alternative: Using `client` directly](#alternative-using-client-directly)
  - [Using Sanity TypeGen](#using-sanity-typegen)
- [Working with images](#working-with-images)
- [Enable preview mode](#enable-preview-mode)
  - [Configure preview mode](#configure-preview-mode)
  - [Add Visual Editing component](#add-visual-editing-component)
    - [Visual Editing configuration options](#visual-editing-configuration-options)
    - [Visual Editing components](#visual-editing-components)
  - [Preview mode route](#preview-mode-route)
  - [Set up CORS for front-end domains](#set-up-cors-for-front-end-domains)
  - [Modify storefront's Content Security Policy (CSP)](#modify-storefronts-content-security-policy-csp)
  - [Set up Presentation tool](#set-up-presentation-tool)
  - [Troubleshooting](#troubleshooting)
- [Using `@sanity/client` directly](#using-sanityclient-directly)
- [Migration Guides](#migration-guides)
- [License](#license)
- [Develop & test](#develop--test)
  - [Release new version](#release-new-version)

> [!NOTE]
> This package builds on [`@sanity/react-loader`](https://github.com/sanity-io/visual-editing/tree/main/packages/react-loader) and [`@sanity/visual-editing`](https://github.com/sanity-io/visual-editing/tree/main/packages/visual-editing), providing Hydrogen-specific optimizations and caching integration. For non-Hydrogen React applications, consider using these packages directly.
>
> Using this package isn't required for working with Sanity in a Hydrogen storefront. If you'd prefer to use `@sanity/react-loader` and/or `@sanity/client` directly, see [Using `@sanity/client` directly](#using-sanityclient-directly) below.

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

Add the Vite plugin to your `vite.config.ts`, after the React Router plugin:

```diff
// ./vite.config.ts

+ import {sanity} from 'hydrogen-sanity/vite'

  export default defineConfig({
-   plugins: [localHttps(httpsOptions), tailwindcss(), ...oxygenPlugins, reactRouter()],
+   plugins: [localHttps(httpsOptions), tailwindcss(), ...oxygenPlugins, reactRouter(), sanity()],
    // ... other config
  })
```

## Usage

Create the Sanity context and pass it through to your application, and optionally, configure the preview mode if you plan to setup Visual Editing

> [!NOTE]
> The examples below are up-to-date as of the Hydrogen 2026.10 React Router template (`@shopify/hydrogen@2026.10.3`). The [example storefront](../../examples/storefront) is a complete integration.

Create a function that makes the Sanity context for each request:

```ts
// ./app/lib/sanity/context.ts

import type {CacheInstance} from '@shopify/hydrogen'
import {createSanityContext, type SanityContext} from 'hydrogen-sanity'

import type {Env} from '~/lib/env'

export function createRequestSanityContext(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext['waitUntil'],
): Promise<SanityContext> {
  return createSanityContext({
    request,

    // To use the Hydrogen cache for queries
    cache,
    waitUntil,

    // Sanity client configuration
    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || 'production',
      apiVersion: env.SANITY_API_VERSION || 'v2025-02-19',
    },

    // You can also initialize a client and pass it instead
    // client: createClient({
    //   projectId: env.SANITY_PROJECT_ID,
    //   dataset: env.SANITY_DATASET,
    //   apiVersion: env.SANITY_API_VERSION,
    // }),

    // Optionally, set a default cache strategy. Defaults to `Cache.long()`
    // defaultStrategy: Cache.short(), // or `null`
  })
}
```

> [!NOTE]
> Keep the client's default `useCdn: true`. `query` and `fetch` read published content from the [API CDN](https://www.sanity.io/docs/content-lake/api-cdn) and send `cacheMode: 'noStale'`, so the API CDN doesn't return stale content. Hydrogen's cache already serves stale content while it revalidates. In preview mode, `hydrogen-sanity` uses the live API.

Then set `context.sanity` in `server.ts`, before React Router handles the request:

```diff
// ./server.ts

  import {envContext} from '~/lib/env'
+ import {createRequestSanityContext} from '~/lib/sanity/context'

  // ...

      const routerContext = new RouterContextProvider()
      routerContext.cache = await caches.open('hydrogen-v1')
      routerContext.set(envContext, env)
      routerContext.env = env
      routerContext.waitUntil = executionContext.waitUntil.bind(executionContext)
+     routerContext.sanity = await createRequestSanityContext(
+       request,
+       env,
+       routerContext.cache,
+       routerContext.waitUntil,
+     )

      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV)
      return handleRequest(request, routerContext as never)
```

> [!IMPORTANT]
> Set `context.sanity` in `server.ts`, before the request handler runs. The [preview mode route](#preview-mode-route) reads it as a property, and with middleware enabled React Router types the context as read-only inside middleware, which stores values with `context.set()` instead.

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
# Studio URL for click-to-edit, e.g. "https://my.sanity.studio" or "/studio" if embedded
SANITY_STUDIO_ORIGIN=""
# Sanity token to authenticate requests in "preview" mode
# must have `viewer` role or higher access
# Create in sanity.io/manage
SANITY_PREVIEW_TOKEN=""
```

Preview mode also uses the template's `SESSION_SECRET` to sign the preview session cookie.

### Satisfy TypeScript

Add the environment variables you created above to `Env`:

> [!NOTE]
> If you plan to reference any environment variables in the client bundle, say for your embedded Studio configuration, you must prefix them with either `PUBLIC_` or `SANITY_STUDIO_`

```diff
// ./app/lib/env.ts

export type Env = {
  // ...other environment variables
  SESSION_SECRET?: string
+ SANITY_PROJECT_ID: string
+ SANITY_DATASET?: string
+ SANITY_API_VERSION?: string
+ SANITY_STUDIO_ORIGIN: string
+ SANITY_PREVIEW_TOKEN?: string
}
```

Then add `sanity` to the router context type:

```diff
// ./env.d.ts

  import type {CacheInstance} from '@shopify/hydrogen'
+ import type {SanityContext} from 'hydrogen-sanity'

  type ReactRouterExampleContext = {
    cache: CacheInstance
    env: Env
    waitUntil: ExecutionContext['waitUntil']
+   sanity: SanityContext
  }
```

### Set up the Sanity provider

You now need to wrap your app with the Sanity provider to make Sanity context available to client-side hooks and components like `useImageUrl` and `Query`.

**Update entry.server.tsx**

Wrap your app with the Sanity provider in your server entry point:

```diff
// ./app/entry.server.tsx

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const env = context.get(envContext)
+ const {SanityProvider} = context.sanity

  // ... CSP setup etc ...

  const body = await renderToReadableStream(
    <NonceProvider value={csp.nonce}>
+     <SanityProvider>
        <ServerRouter context={reactRouterContext} url={request.url} nonce={csp.nonce} />
+     </SanityProvider>
    </NonceProvider>,
    // ... render options
  )
}
```

**Update root.tsx**

Add the `Sanity` component to your root layout:

```diff
// ./app/root.tsx

+ import {Sanity} from 'hydrogen-sanity'

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}

+       {/* Add Sanity client-side script */}
+       <Sanity nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

## Interacting with Sanity data

### Recommended: Using `query` and `Query` together

The `query` method and `Query` component work together to provide an optimized data fetching and rendering experience that automatically adapts based on whether Sanity preview mode is active:

**Best for**: Most applications wanting opinionated best practices with automatic optimization

- **Opinionated approach**: Curated patterns that codify Hydrogen + Sanity best practices
- Automatic preview mode detection and switching
- Built-in Visual Editing with click-to-edit overlays
- **Bundle optimization**: Preview-related code is conditionally loaded only when needed
- **Configuration decisions made for you**: Cache strategies, session management, and Visual Editing setup follow recommended approaches

**How it works**:

- **When preview mode is active**: Dynamically imports `@sanity/react-loader` with `loadQuery` for loader integration and client-side re-rendering with `useQuery` for real-time Studio updates
- **When preview mode is inactive**: Uses lightweight direct client `fetch` for optimal performance with static rendering
- **Bundle efficiency**: The `Query` component uses React's `lazy()` to conditionally load client-side preview components only when needed, while server-side `loadQuery` imports happen at runtime only when preview mode is detected

**Step 1: Fetch data in your loader with `query`**

```ts
import {defineQuery} from 'groq'

const HOMEPAGE_QUERY = defineQuery(`*[_id == "home"][0]{
  _id,
  title,
  hero {
    title,
    description,
    image {
      asset->{
        _id,
        url
      },
      alt
    }
  },
  modules[] {
    _type,
    _type == "productShowcase" => {
      products[]-> {
        _id,
        store {
          title,
          slug,
          previewImageUrl
        }
      }
    }
  }
}`)

export async function loader({context}: Route.LoaderArgs) {
  const initial = await context.sanity.query(HOMEPAGE_QUERY, undefined, {
    tag: 'homepage',
  })

  return {initial}
}
```

**Step 2: Render with the `Query` component**

```tsx
import {Query} from 'hydrogen-sanity'

export default function HomePage({loaderData}: Route.ComponentProps) {
  const {initial} = loaderData

  return (
    <Query query={HOMEPAGE_QUERY} options={{initial}}>
      {(homepage, encodeDataAttribute) => (
        <div>
          <h1>{homepage?.hero?.title}</h1>
          <p>{homepage?.hero?.description}</p>

          {homepage?.modules?.map((module) => {
            switch (module._type) {
              case 'productShowcase':
                return (
                  <div
                    key={module._key}
                    data-sanity={encodeDataAttribute(['modules', {_key: module._key}, '_type'])}
                  >
                    <div className="products">
                      {module.products?.map((product) => (
                        <div key={product._id}>
                          <h3>{product.store?.title}</h3>
                          {product.store?.slug && (
                            <Link to={`/products/${product.store.slug}`}>View Product</Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )

              default:
                return null
            }
          })}
        </div>
      )}
    </Query>
  )
}
```

> [!NOTE]
> The `encodeDataAttribute` function enables click-to-edit functionality in Sanity Studio's Presentation tool. It's only available when Sanity preview mode is active (managed via preview session) and returns `undefined` otherwise.
>
> It also requires `stega.studioUrl` in the server client configuration — see [Configure preview mode](#configure-preview-mode). `<VisualEditing>` reads it from the server, so you don't pass it again.

In preview mode `query` returns `{data, sourceMap, perspective}` for `Query`; otherwise it returns the result. To check the result in the loader, for example to return a 404, use `isQueryResponseInitial`:

```ts
import {isQueryResponseInitial} from 'hydrogen-sanity'

export async function loader({context, params}: Route.LoaderArgs) {
  const initial = await context.sanity.query(PAGE_QUERY, {slug: params.slug})
  const page = isQueryResponseInitial(initial) ? initial.data : initial

  if (!page) throw new Response('Not found', {status: 404})

  return {initial}
}
```

**Advanced Options**

Both methods accept the same options as their underlying implementations:

```ts
// In your loader
const initial = await context.sanity.query<HomePage>(queryString, params, {
  // Hydrogen caching options
  hydrogen: {
    cache: Cache.short(),
    // Skip caching a miss
    shouldCacheResult: (page) => page !== null,
  },
  // Sanity request options
  tag: 'home',
})

// In your component
<Query
  query={queryString}
  params={params}
  options={{initial}}
  fallback={<div>Loading...</div>} // React Suspense props
>
  {(data) => <YourComponent data={data} />}
</Query>
```

### Lower level: `loadQuery` in preview mode

`query` calls `loadQuery` for you in preview mode. Call it yourself only when you render with the `useQuery` hook instead of the `Query` component. It returns `{data, sourceMap, perspective}`, which `useQuery` takes as `initial`:

```ts
import {useQuery} from 'hydrogen-sanity'

export async function loader({context}: Route.LoaderArgs) {
  const initial = await context.sanity.loadQuery(PAGE_QUERY, {id: 'home'})
  return {initial}
}

export default function Page({loaderData}: Route.ComponentProps) {
  const {data, encodeDataAttribute} = useQuery(
    PAGE_QUERY,
    {id: 'home'},
    {initial: loaderData.initial},
  )
  // ...
}
```

`loadQuery` takes the same `hydrogen` options as `query`. Outside preview mode it logs a warning in development: use `query` or `fetch` there.

### Alternative: Direct queries using `fetch`

**Best for**: When preview mode is not needed and bundle optimization is priority

- Lightweight with direct client results
- No preview or loader integration

For Sanity queries that don't need loader integration, there is a `fetch` method that also integrates with Hydrogen's cache:

```ts
export async function loader({context}: Route.LoaderArgs) {
  const query = `*[_type == "page" && _id == $id][0]`

  const page = await context.sanity.fetch<HomePage>(
    query,
    {id: 'home'},
    {
      hydrogen: {
        cache: Cache.short(),
        // Skip caching a miss
        shouldCacheResult: (page) => page !== null,
      },
      tag: 'home',
    },
  )

  return {page}
}
```

### Alternative: Using `client` directly

The Sanity client (either instantiated from your configuration or passed through directly) is also available in your app's context. It is recommended to use `query` for data fetching; but the Sanity client can be used for mutations within actions, for example:

```ts
export async function action({context, request}: Route.ActionArgs) {
  if (!isAuthenticated(request)) {
    return redirect('/login')
  }

  const env = context.get(envContext)
  const formData = await request.formData()

  return context.sanity.client
    .withConfig({token: env.SANITY_WRITE_TOKEN})
    .create({_type: 'comment', text: String(formData.get('text'))})
}
```

### Using Sanity TypeGen

[Sanity TypeGen](https://www.sanity.io/docs/sanity-typegen) generates TypeScript definitions for your [GROQ](https://www.sanity.io/docs/groq) queries. To use TypeGen with `hydrogen-sanity`, install `groq` as a dependency:

```sh
npm install groq
```

> [!TIP]  
> Refer to TypeGen steps covered in the [Sanity TypeGen documentation](https://www.sanity.io/docs/sanity-typegen). TypeGen with `overloadClientMethods: true` uses [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to automatically generate types for your GROQ queries.

Now your queries will have automatic type inference:

```ts
import {defineQuery} from 'groq'

const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]`)

export async function loader({context, params}: Route.LoaderArgs) {
  // `initial` and the `$slug` param are typed from the query
  const initial = await context.sanity.query(PAGE_QUERY, {slug: params.slug})

  return {initial}
}
```

#### Typed `.groq` file imports (experimental)

[`@sanity-labs/groq-content-mapper`](https://github.com/sanity-labs/groq-content-mapper) lets you keep each query in its own `.groq` file and import it as a string that carries its result and params types, inferred from your schema. `query`, `loadQuery`, `fetch`, `<Query>` and `useQuery` pick both up, so there's no generic to pass and no `SanityQueries` entry to generate:

```ts
import post from './post.groq' with {type: 'text'}

export async function loader({context, params}: Route.LoaderArgs) {
  // Typed from `post.groq`, and `{slug}` is checked against its `$slug` placeholder
  const initial = await context.sanity.query(post, {slug: params.handle})

  return {initial}
}
```

It needs `@sanity/client` 7.28.0 or later, TypeScript 7.1 or later, and type checking with `tsc --runExternalCode`. The mapper reads the `schema.json` that `sanity schema extract` writes:

```ts
// sanity.cli.ts
export default defineCliConfig({
  api: {projectId: 'your-project-id', dataset: 'production'},
  schemaExtraction: {
    path: './schema.json', // default
    enforceRequiredFields: false, // default
    // workspace: 'production', // required if sanity.config.ts exports an array of named workspaces
  },
})
```

Register the mapper in `tsconfig.json`, and add its Vite plugin next to the React Router and Sanity plugins so `.groq` imports also load at runtime:

```jsonc
// tsconfig.json
{
  "contentMappers": [
    {
      "package": "@sanity-labs/groq-content-mapper",
      "extensions": [".groq"],
      "options": {
        "schema": "./schema.json",
        // "schemas": [{"include": "app/queries/blog", "schema": "./blog.schema.json"}], // required if queries in different folders target different projects or datasets
      },
    },
  ],
}
```

```ts
// vite.config.ts
import groqFiles from '@sanity-labs/groq-content-mapper/vite'

export default defineConfig({
  plugins: [/* ... */ reactRouter(), sanity(), groqFiles()],
})
```

> [!WARNING]
> Reading types from `.groq` imports is experimental in both `@sanity/client` and `@sanity-labs/groq-content-mapper`, and may change in a minor release. See the [`@sanity-labs/groq-content-mapper` setup guide](https://github.com/sanity-labs/groq-content-mapper/tree/main/packages/groq-content-mapper#readme) for editor support, multiple schemas and other runtimes.

## Working with images

`Image` renders images from the [Sanity Image CDN](https://www.sanity.io/docs/image-urls) with right-sized, auto-formatted (AVIF/WebP) `srcset` candidates. Size it with `width`, `height`, `aspectRatio`, `sizes`, `loader` and `srcSetOptions`.

Pass the whole image value from a GROQ query:

```tsx
import {Image as SanityImage, isImageWithAsset} from 'hydrogen-sanity'

const HERO_QUERY = defineQuery(`
  fn image::asset($asset) = $asset->{_id, url, metadata{lqip}};
  fn image::field($image) = $image{alt, crop, hotspot, "asset": image::asset(asset)};

  *[_id == "home"][0]{"image": image::field(hero.image)}
`)

function Hero({image}: {image: HERO_QUERY_RESULT['image']}) {
  if (!isImageWithAsset(image)) return null

  return (
    <SanityImage src={image} aspectRatio="16/9" sizes="100vw" placeholder="blur" loading="eager" />
  )
}
```

- `src` accepts image objects (`{asset, crop, hotspot}`) in every shape Sanity TypeGen generates, asset documents (`asset->{_id, url}`), asset references and ids, and Sanity Image CDN URLs (`asset->url`, or a URL built with `useImageUrl`). Stega-encoded values from preview mode are cleaned automatically, so don't `stegaClean()` them first.
- The crop set in the Studio is applied. When `aspectRatio` (or a fixed `width` and `height`) differs from the cropped image, the CDN crop is positioned around the hotspot.
- `width` and `height` are optional. Without them the image is fluid (`width: 100%`), its `width`/`height` attributes come from the CDN URL or the asset filename (adjusted for the crop), and `srcset` candidates stop at the size of the source image. A numeric `width` renders a fixed-size image with `1x`, `2x` and `3x` candidates.
- `placeholder="blur"` shows `asset->metadata.lqip` while the image loads, or a `blurDataURL` you pass. Allow `data:` in your [CSP](#modify-storefronts-content-security-policy-csp) `imgSrc` for it to render.
- `fill` makes the image cover its parent (which needs `position: relative`), and `object-position` defaults to the hotspot. The same default applies to `style={{objectFit: 'cover'}}`. An explicit `style.objectPosition` wins.
- `queryParams` adds more [image transformations](https://www.sanity.io/docs/image-urls), e.g. `queryParams={{sat: -100}}`. `fit`, `crop` and `fp-x`/`fp-y` are applied before the crop and hotspot are computed. Sizing params (`w`, `h`, `rect`) are ignored.
- The project and dataset come from the [Sanity provider](#set-up-the-sanity-provider). Pass `projectId` and `dataset` to render images from another project.
- The image's `alt` field is used when you don't pass `alt`.
- `InferImageValue` and `InferStrictImageValue` collect the image shapes from a TypeGen query result, including stega-branded results. `isImageWithAsset` narrows an image to one with an asset.

Use `getImageProps` to get the same attributes without rendering, for example for art direction with `<picture>`:

```tsx
import {getImageProps, Image as SanityImage, type InferStrictImageValue} from 'hydrogen-sanity'

function Banner({image}: {image: InferStrictImageValue<BANNER_QUERY_RESULT>}) {
  const mobile = getImageProps({src: image, aspectRatio: '1/1', sizes: '100vw'}).props

  return (
    <picture>
      <source
        media="(max-width: 45em)"
        srcSet={mobile.srcSet}
        sizes={mobile.sizes}
        width={mobile.width}
        height={mobile.height}
      />
      <SanityImage src={image} aspectRatio="21/9" sizes="100vw" />
    </picture>
  )
}
```

The `useImageUrl` hook provides a convenient way to generate optimized image URLs from Sanity image assets with the [image URL builder](https://www.sanity.io/docs/image-url), when you need a URL rather than an `<img>`.

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

## Enable preview mode

Enabling preview mode provides real-time content editing with visual overlays inside the [Presentation tool](https://www.sanity.io/docs/presentation). `hydrogen-sanity` includes everything needed to make your storefront Presentation-aware.

> [!NOTE]
>
> These instructions assume some familiarity with Sanity's Visual Editing concepts, like loaders and overlays. To learn more, please visit the [Visual Editing documentation](https://www.sanity.io/docs/introduction-to-visual-editing).

### Configure preview mode

For Visual Editing to work, you need to configure Sanity preview mode in your context. Preview mode is a session-based state that gets activated when users visit your storefront through Sanity Studio's Presentation tool or through a preview link shared from Studio. First, initialize the preview session:

```diff
// ./app/lib/sanity/context.ts

import type {CacheInstance} from '@shopify/hydrogen'
import {createSanityContext, type SanityContext} from 'hydrogen-sanity'
+ import {isPreviewEnabled} from 'hydrogen-sanity/preview'
+ import {PreviewSession} from 'hydrogen-sanity/preview/session'

- export function createRequestSanityContext(
+ export async function createRequestSanityContext(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext['waitUntil'],
): Promise<SanityContext> {
+ // Initialize the preview session. Without the secret and token, render published content only
+ const previewSession =
+   env.SESSION_SECRET && env.SANITY_PREVIEW_TOKEN
+     ? await PreviewSession.init(request, [env.SESSION_SECRET])
+     : undefined

  return createSanityContext({
    request,
    cache,
    waitUntil,

    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET || 'production',
      apiVersion: env.SANITY_API_VERSION || 'v2025-02-19',

+     // Enable stega encoding only when in preview mode
+     stega: {
+       enabled: previewSession ? isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession) : false,
+       // Where the Studio is hosted — required for click-to-edit / `encodeDataAttribute`.
+       // Full URL (`https://my.sanity.studio`) or base path if embedded (`/studio`).
+       studioUrl: env.SANITY_STUDIO_ORIGIN,
+     },
    },

+   // Preview configuration
+   preview:
+     previewSession && env.SANITY_PREVIEW_TOKEN
+       ? {token: env.SANITY_PREVIEW_TOKEN, session: previewSession}
+       : undefined,
  })
}
```

> [!NOTE]
> `PreviewSession` is a dedicated cookie session. It doesn't share the template's customer account session.

> [!NOTE]
> **Stega encoding** enables click-to-edit functionality by encoding content source information directly into strings. Learn more about [Content Source Maps and stega](https://www.sanity.io/docs/visual-editing/stega).

### Add Visual Editing component

Set up your root route to enable Visual Editing across the entire application when preview mode is active:

```diff
// ./app/root.tsx

// ...other imports
+ import {usePreviewMode} from 'hydrogen-sanity/preview'
+ import {VisualEditing} from 'hydrogen-sanity/visual-editing'

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()
+ const previewMode = usePreviewMode()

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

+       {/* Conditionally render `VisualEditing` component only when in preview mode */}
+       {previewMode ? <VisualEditing action="/api/preview" /> : null}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

> [!NOTE]
> `<VisualEditing>` (and `<LiveMode>`) runs a separate Sanity client in the browser. It reads `studioUrl` from the server client's `stega.studioUrl` when that's a string, so you set it once.
>
> A `stega.filter` function, or a function-valued `studioUrl`, can't cross from the server. Define it once in a shared module, like the example storefront's [`stega.ts`](../../examples/storefront/app/lib/sanity/stega.ts), and pass it to both `createSanityContext` and `<VisualEditing filter={filter} />`.

#### Visual Editing configuration options

The `VisualEditing` component provides flexible configuration for different data loading patterns:

**Server-Only Setup (default):**
Best when using only server-side data fetching (direct `fetch` or `loadQuery` without client components).

```tsx
<VisualEditing /> // Overlays only with server revalidation
```

**With Client-Side Loaders (recommended for `Query` component or `useQuery` hooks):**
The component automatically detects when you're using client-side loaders (`Query` components or `useQuery` hooks) and enables live mode accordingly:

```tsx
// Default usage - automatically enables live mode when needed
<VisualEditing action="/api/preview" />
```

**Stega clipboard and misuse reporting:**

```tsx
<VisualEditing
  // Opt out of stripping stega from the clipboard on copy (default strips)
  keepStegaOnCopy
  // Opt-in: report stega found in unsafe placements (class, href, <head>, etc.)
  onSuspiciousStega={(reports) => {
    for (const report of reports) console.warn(`Stega found in ${report.kind}`, report)
  }}
/>
```

> [!NOTE]
> **Automatic Detection**: Live mode automatically activates when:
>
> - `Query` components are rendered
> - `useQuery` hooks are called

#### Visual Editing components

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

This Visual Editing component provides a complete Visual Editing experience, including:

- **Context-aware behavior**: Auto-detects Studio vs standalone preview contexts
- **Real-time preview**: Updates content as you edit in Studio
- **Visual overlays**: Click-to-edit functionality with element highlighting
- **Perspective switching**: Draft/published content switching
- **Server revalidation**: Smart refresh logic for server-side data
- **Custom revalidation**: Customizable refresh logic for more control

### Preview mode route

For Sanity's Presentation tool to activate preview mode, you need to set up a route that handles authentication and session management. When users work in Sanity Studio's Presentation tool, it automatically calls this endpoint to enable preview mode.

`hydrogen-sanity` comes with a preconfigured route for this purpose. When Sanity's Presentation tool loads your storefront, it automatically makes requests to this route with a secret token. If the secret is valid, the route activates preview mode by writing the `projectId` to the preview session.

> [!NOTE]
>
> For Visual Editing overlays and click-to-edit functionality to work, you must configure `stega.enabled: true` in your Sanity client configuration.
>
> You can learn more about [Content Source Maps and working with stega-encoded strings](https://www.sanity.io/docs/stega).

Add this route to your project like below, or view the source to copy and modify it in your project.

```tsx
// ./app/routes/api.preview.ts

export {action, loader} from 'hydrogen-sanity/preview/route'
```

Then register it in your route config:

```diff
// ./app/routes.ts

export default [
  index('routes/home.tsx'),
  // ...other routes
+ route('api/preview', 'routes/api.preview.ts'),
  route('*', 'routes/catchall.tsx'),
] satisfies RouteConfig
```

### Set up CORS for front-end domains

If your Sanity Studio is not embedded in your Hydrogen App, you will need to add a Cross-Origin Resource Sharing (CORS) origin to your project for every URL where your app is hosted or running in development.

Add `http://localhost:5173` (or `https://local.tryhydrogen.dev:5173` with `npm run dev:https`) to the CORS origins in your Sanity project settings at [sanity.io/manage](https://sanity.io/manage). Learn more about [CORS configuration in Sanity](https://www.sanity.io/docs/front-ends-and-cors).

### Modify storefront's Content Security Policy (CSP)

Since Sanity Studio's Presentation tool displays the storefront inside an iframe, you will need to adjust the Content Security Policy (CSP) in `entry.server.tsx`.

> [!TIP]
>
> Review Hydrogen's [content security policy documentation](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy) to ensure your storefront is secure.

```diff
// ./app/entry.server.tsx

// ...all other imports

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const env = context.get(envContext)
+ const projectId = env.SANITY_PROJECT_ID
+ const isPreviewEnabled = context.sanity.preview?.enabled

  const csp = createContentSecurityPolicy({
    shop: {
      storeDomain: getStoreDomain(env),
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
    },
+   directives: {
      // Sanity Image CDN, and the blur placeholders of `Image` (`data:` URLs)
+     imgSrc: ['https://cdn.sanity.io', 'data:'],
      // Allow Studio to load your storefront in Presentation's iframe
+     frameAncestors: isPreviewEnabled ? [env.SANITY_STUDIO_ORIGIN] : [],
+   },
  })

  // ...render, then apply the headers
  csp.applyResponseHeaders(responseHeaders)
}
```

Hydrogen merges `directives` with the Shopify directives, so you list only the Sanity sources.

If you embed the Studio in your storefront, it also needs these sources:

```ts
directives: {
  // Sanity assets, and user avatars in the Studio
  defaultSrc: ['https://cdn.sanity.io', 'https://lh3.googleusercontent.com'],
  imgSrc: ['https://cdn.sanity.io', 'https://lh3.googleusercontent.com', 'data:'],
  // Real-time collaboration in the Studio
  connectSrc: [`https://${projectId}.api.sanity.io`, `wss://${projectId}.api.sanity.io`],
  // The embedded Studio loads the storefront from the same origin
  frameAncestors: [`'self'`],
},
```

### Set up Presentation tool

Now in your Sanity Studio config, import the Presentation Tool with the preview URL set to the preview route you created.

> [!TIP]
>
> Consult the [Visual Editing documentation](https://www.sanity.io/docs/introduction-to-visual-editing) for how to [configure the Presentation tool](https://www.sanity.io/docs/configuring-the-presentation-tool).

```diff
// ./sanity.config.ts

// Add this import
+ import {presentationTool} from 'sanity/presentation'

export default defineConfig({
  // ...all other settings

  plugins: [
+   presentationTool({
+     previewUrl: {
+       // If you're hosting your storefront on a separate domain, you'll need to provide an `origin`:
+       // origin: process.env.SANITY_STUDIO_STOREFRONT_ORIGIN
+       previewMode: {
+         // This path is relative to the origin above and should match the route in your storefront that you've setup above
+         enable: '/api/preview',
+       },
+     },
+   }),
    // ..all other plugins
  ],
})
```

You should now be able to view your Hydrogen app in the Presentation Tool, click to edit any Sanity content and see live updates as you make changes.

> [!NOTE]
>
> Presentation loads your storefront in an iframe, so the preview session cookie is a third-party cookie there. `PreviewSession` already sets `sameSite: 'none'` and `secure: true`. If preview works locally but not after you deploy, check that the deployment has `SESSION_SECRET` and `SANITY_PREVIEW_TOKEN`, and that the browser doesn't block third-party cookies for the storefront's domain.

### Troubleshooting

Are you getting the following error when trying to load your storefront in the Presentation Tool?

> Unable to connect to Visual Editing. Make sure you've setup '@sanity/visual-editing' correctly

Presentation will throw this error if it can't establish a connection to your storefront. Here are a few things to double-check in your setup to try and troubleshoot:

1. Confirm that you've provided `preview` configuration to the Sanity context.
2. Confirm that you've added the `VisualEditing` component to your root layout.
3. If you've followed the instructions above, the `VisualEditing` component will be conditionally rendered if the app has been successfully put into preview mode.
4. If you're using a session cookie, check your browser devtools and confirm that the cookie has been set as expected.
5. Since Presentation loads your storefront in an `iframe`, double check your cookie and CSP configuration.
6. The preview mode route logs the cause of a failure in the server log, for example a missing `context.sanity` or `SANITY_PREVIEW_TOKEN`.

Do overlays show, but clicking doesn't open the document? `encodeDataAttribute` returns `undefined` when the server client has no `stega.studioUrl`. See [Configure preview mode](#configure-preview-mode).

## Using `@sanity/client` directly

If you prefer not to use `hydrogen-sanity`, you can configure [`@sanity/client`](https://www.sanity.io/docs/js-client) directly in your Hydrogen storefront.

The following example configures Sanity Client and provides it in the request context.

```diff
// ./server.ts

+ import {createClient} from '@sanity/client'

  // ...

      routerContext.waitUntil = executionContext.waitUntil.bind(executionContext)
+     routerContext.sanity = createClient({
+       projectId: env.SANITY_PROJECT_ID,
+       dataset: env.SANITY_DATASET,
+       apiVersion: env.SANITY_API_VERSION ?? 'v2025-02-19',
+     })
```

```diff
// ./env.d.ts

+ import type {SanityClient} from '@sanity/client'

  type ReactRouterExampleContext = {
    cache: CacheInstance
    env: Env
    waitUntil: ExecutionContext['waitUntil']
+   sanity: SanityClient
  }
```

Then, in your loaders and actions you'll have access to Sanity Client in context. Pass `cacheMode: 'noStale'` so the API CDN doesn't return stale content:

```ts
export async function loader({context}: Route.LoaderArgs) {
  const {sanity} = context
  const homepage = await sanity.fetch(
    `*[_type == "page" && _id == $id][0]`,
    {id: 'home'},
    {cacheMode: 'noStale'},
  )

  return {homepage}
}
```

To cache your query responses in Hydrogen, use `createRunWithCache`. Hydrogen 2026.10 caches only plain objects, so wrap the query result:

```ts
import {Cache, createRunWithCache} from '@shopify/hydrogen'

export async function loader({context}: Route.LoaderArgs) {
  const {cache, waitUntil, sanity} = context
  const runWithCache = createRunWithCache({cache, waitUntil})

  const {data} = await runWithCache({key: 'home', strategy: Cache.long()}, async () => {
    const homepage = await sanity.fetch(
      `*[_type == "page" && _id == $id][0]`,
      {id: 'home'},
      {cacheMode: 'noStale'},
    )
    // Avoid caching a miss
    return {data: {homepage}, shouldCache: Boolean(homepage)}
  })

  return {homepage: data.homepage}
}
```

## Migration Guides

- [From `v3` to `v4`](https://github.com/sanity-io/hydrogen-sanity/blob/main/packages/hydrogen-sanity/MIGRATE-v3-to-v4.md)
- [From `v4` to `v5`](https://github.com/sanity-io/hydrogen-sanity/blob/main/packages/hydrogen-sanity/MIGRATE-v4-to-v5.md)
- [From `v6` to `v7`](https://github.com/sanity-io/hydrogen-sanity/blob/main/packages/hydrogen-sanity/MIGRATE-v6-to-v7.md)
- [From `v7` to `v8`](https://github.com/sanity-io/hydrogen-sanity/blob/main/packages/hydrogen-sanity/MIGRATE-v7-to-v8.md)

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>

## Develop & test

This plugin uses [@sanity/pkg-utils](https://github.com/sanity-io/pkg-utils)
with default configuration for build & watch scripts.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/hydrogen-sanity/actions/workflows/ci.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.
