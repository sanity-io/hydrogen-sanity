# hydrogen-sanity

[Sanity.io](https://www.sanity.io) toolkit for [Hydrogen](https://hydrogen.shopify.dev/). Requires `@shopify/hydrogen >= 2023.7.0`.

- [Installation](#installation)
- [Usage](#usage)
  - [Satisfy TypeScript](#satisfy-typescript)
- [Interacting with Sanity data](#interacting-with-sanity-data)
  - [Preferred: Cached queries using `loadQuery`](#preferred-cached-queries-using-loadquery)
  - [Additional `loadQuery` options](#additional-loadquery-options)
  - [Alternatively: Using `client` directly](#alternatively-using-client-directly)
- [Enable Visual Editing](#enable-visual-editing)
  - [Enabling preview mode](#enabling-preview-mode)
  - [Setup CORS for front-end domains](#setup-cors-for-front-end-domains)
  - [Modify storefront's Content Security Policy (CSP)](#modify-storefronts-content-security-policy-csp)
  - [Setup Presentation tool](#setup-presentation-tool)
- [Using `@sanity/client` instead of `hydrogen-sanity`](#using-sanityclient-instead-of-hydrogen-sanity)
- [Migration Guides](#migration-guides)
- [License](#license)
- [Develop \& test](#develop--test)
  - [Release new version](#release-new-version)

**Features:**

- Cacheable queries to [Sanity API CDN](https://www.sanity.io/docs/api-cdn)
- Interactive live preview with [Visual Editing](https://www.sanity.io/docs/loaders-and-overlays)

> [!TIP]
>
> If you'd prefer a self-paced course on how to use Sanity and Hydrogen, check out the [Sanity and Shopify with Hydrogen on Sanity Learn](https://www.sanity.io/learn/course/sanity-and-shopify-with-hydrogen).

> [!NOTE]
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

> [!NOTE]
> The examples below are up-to-date as of `npm create @shopify/hydrogen@2024.7.10`

```ts
// ./lib/context.ts

// ...all other imports
import {createSanityContext} from 'hydrogen-sanity';

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  // ... Leave all other functions like the Hydrogen context as-is
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  // 1. Configure the Sanity Loader and preview mode
  const sanity = createSanityContext({
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

      // In preview mode, `stega` will be enabled automatically
      // If you need to configure the client's steganography settings,
      // you can do so here
      // stega: {
      //   logger: console
      // }
    }),

    // You can also initialize a client and pass it instead
    // client: createClient({
    //   projectId: env.SANITY_PROJECT_ID,
    //   dataset: env.SANITY_DATASET,
    //   apiVersion: env.SANITY_API_VERSION || '2023-03-30',
    //   useCdn: process.env.NODE_ENV === 'production',
    // }),

    // Optionally, set a default cache strategy, defaults to `CacheLong`
    // strategy: CacheShort() | null,

    // Optionally, enable Visual Editing
    // See "Visual Editing" section below to setup the preview route
    // preview: env.SANITY_API_TOKEN
    //   ? {
    //       enabled: session.get('projectId') === env.SANITY_PROJECT_ID,
    //       token: env.SANITY_API_TOKEN,
    //       studioUrl: 'http://localhost:3333',
    //     }
    //   : undefined,
  })

  // 2. Make Sanity available to loaders and actions in the request context
  return {
    ...hydrogenContext,
    sanity,
  };
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

Update the environment variables in `Env` to include the ones you created above:

```ts
// ./env.d.ts

declare global {
  // ...other types

  interface Env extends HydrogenEnv {
    // ...other environment variables

    SANITY_PROJECT_ID: string
    SANITY_DATASET?: string
    SANITY_API_VERSION?: string
    SANITY_API_TOKEN: string
  }
}
```

> [!WARNING]
>
> `hydrogen-sanity` will automatically add `sanity` to the `AppLoadContext` interface

## Interacting with Sanity data

### Preferred: Cached queries using `loadQuery`

Query Sanity's API and use Hydrogen's cache to store the response (defaults to `CacheLong` caching strategy). While in preview mode, `loadQuery` will use `CacheNone` to prevent results from being cached.

> [!TIP]
> You can use [Sanity TypeGen tooling](https://www.sanity.io/docs/sanity-typegen) to generate TypeScript definitions for your GROQ queries.

Learn more about configuring [caching in Hydrogen on the Shopify documentation](https://shopify.dev/docs/custom-storefronts/hydrogen/caching).

Sanity queries will appear in Hydrogen's [Subrequest Profiler](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/subrequest-profiler). By default, they're titled `Sanity query`; however, you can give your queries more descriptive titles by using the request option below.

```ts
export async function loader({context, params}: LoaderFunctionArgs) {
  const query = `*[_type == "page" && _id == $id][0]`
  const params = {id: 'home'}
  const initial = await context.sanity.loadQuery(query, params)

  return json({initial})
}
```

### Additional `loadQuery` options

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
    // }
  },

  // ...as well as other request options
  // tag: 'home',
  // headers: {
  //   'Accept-Encoding': 'br, gzip, *',
  // },
})
```

> [!TIP]
> You can learn more about request tagging in [the documentation](https://www.sanity.io/docs/reference-api-request-tags).

### Alternatively: Using `client` directly

The Sanity client (either instantiated from your configuration or passed through directly) is also available in your app's context. It is recommended to use `loadQuery` for data fetching; but the Sanity client can be used for mutations within actions, for example:

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

## Enable Visual Editing

Enable real-time, interactive live preview inside the Presentation tool of your Sanity Studio. `hydrogen-sanity` comes with a ready-to-use version of the `VisualEditing` component that's compatible with Hydrogen and Oxygen.

> [!NOTE]
>
> These instructions assume some familiarity with Sanity's Visual Editing concepts, like loaders and overlays. To learn more, please visit the [Visual Editing documentation](https://www.sanity.io/docs/introduction-to-visual-editing).

First set up your root route to enable preview mode across the entire application, if the preview session is active:

```tsx
// ./app/root.tsx

// ...other imports
import {VisualEditing} from 'hydrogen-sanity/visual-editing'

export async function loader({context}: LoaderArgs) {
  return json({
    // ... other loader data
    isPreviewEnabled: context.sanity.preview?.enabled,
  })
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce()
  const {isPreviewEnabled, ...data} = useRouteLoaderData<RootLoader>('root')

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
        {isPreviewEnabled ? <VisualEditing /> : null}

        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

This Visual Editing component will trigger incremental updates to draft documents from the server for users with a valid preview session. [Duplicate its source](https://github.com/sanity-io/visual-editing/blob/main/packages/visual-editing/src/remix/VisualEditing.tsx) into your own project if you wish to customize its behavior.

### Enabling preview mode

For users to enter preview mode, they will need to visit a route that performs some authentication and then writes to the session.

`hydrogen-sanity` comes with a preconfigured route for this purpose. It checks the value of a secret in the URL used by Presentation tool - and if valid - writes the `projectId` to the Hydrogen session.

> [!NOTE]
>
> By default, `hydrogen-sanity` will enable stega-encoded Content Source Maps when preview mode is enabled.
>
> You can learn more about Content Source Maps and working with stega-encoded strings in [the documentation](https://www.sanity.io/docs/stega).

Add this route to your project like below, or view the source to copy and modify it in your project.

```tsx
// ./app/routes/resource.preview.ts

export {loader} from 'hydrogen-sanity/preview/route'

// Optionally, export the supplied action which will disable preview mode when POSTed to
// export {action, loader} from 'hydrogen-sanity/preview/route'
```

### Setup CORS for front-end domains

If your Sanity Studio is not embedded in your Hydrogen App, you will need to add a CORS origin to your project for every URL where your app is hosted or running in development.

Add `http://localhost:3000` to the CORS origins in your Sanity project settings at [sanity.io/manage](https://sanity.io/manage).

### Modify storefront's Content Security Policy (CSP)

Since Sanity Studio's Presentation tool displays the storefront inside an iframe, you will need to adjust the Content Security Policy (CSP) in `entry.server.tsx`.

> [!TIP]
>
> Review Hydrogen's [content security policy documentation](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy) to ensure your storefront is secure.

```ts
// ./app/entry.server.tsx

// ...all other imports
import type {AppLoadContext, EntryContext} from '@shopify/remix-oxygen'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  const projectId = loadContext.env.SANITY_PROJECT_ID
  const studioHostname = loadContext.env.SANITY_STUDIO_HOSTNAME || 'http://localhost:3333'
  const isPreviewEnabled = loadContext.sanity.preview?.enabled

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    // If your storefront and Studio are on separate domains...
    // ...allow Sanity assets loaded from the CDN to be loaded in your storefront
    defaultSrc: ['https://cdn.sanity.io'],
    // ...allow Studio to load your storefront in Presentation's iframe
    frameAncestors: isPreviewEnabled ? [studioHostname] : undefined,

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

### Setup Presentation tool

Now in your Sanity Studio config, import the Presentation tool with the Preview URL set to the preview route you created.

> [!TIP]
>
> Consult the Visual Editing documentation for how to [configure the Presentation tool](https://www.sanity.io/docs/configuring-the-presentation-tool).

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
          enable: '/resource/preview',
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

## Using `@sanity/client` instead of `hydrogen-sanity`

For whatever reason, if you choose not to use `hydrogen-sanity` you could still configure `@sanity/react-loader` or `@sanity/client` to get Sanity content into your Hydrogen storefront.

The following example configures Sanity Client and provides it in the request context.

```ts
// ./server.ts

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
    apiVersion: env.SANITY_API_VERSION ?? 'v2024-08-08',
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

  return json({homepage})
}
```

If you want to cache your query responses in Hydrogen, you can use the [`withCache` utility](https://shopify.dev/docs/custom-storefronts/hydrogen/caching/third-party#hydrogen-s-built-in-withcache-utility):

```ts
export async function loader({context, params}: LoaderArgs) {
  const {withCache, sanity} = context

  const homepage = await withCache('home', CacheLong(), () =>
    sanity.fetch(`*[_type == "page" && _id == $id][0]`, {id: 'home'}),
  )

  return json({homepage})
}
```

## Migration Guides

- [From `v3` to `v4`](https://github.com/sanity-io/hydrogen-sanity/blob/main/package/MIGRATE-v3-to-v4.md)

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>

## Develop & test

This plugin uses [@sanity/pkg-utils](https://github.com/sanity-io/pkg-utils)
with default configuration for build & watch scripts.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/hydrogen-sanity/actions/workflows/main.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.
