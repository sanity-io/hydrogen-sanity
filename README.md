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

```ts
// server.ts

import {createSanityClient} from 'hydrogen-sanity';

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

/**
 * Create a Remix request handler and pass
 * Sanity client to the loader context
 */
const handleRequest = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  getLoadContext: () => ({
    // ...other providers
    sanity,
  }),
});
```

### Fetching Sanity data with `query`

Query Sanity API and cache the response (defaults to `CacheLong` caching strategy):

```ts
export async function loader({context, params}: LoaderArgs) {
  const homepage = await context.sanity.query({
    query: `*[_type == "home"][0]`
    // optionally pass caching strategy
    // cache: CacheShort()
  });

  return json({
    homepage,
  });
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

```tsx
// root.tsx

export async function loader({context}: LoaderArgs) {
  const preview: PreviewData | undefined = isPreviewModeEnabled(
    context.sanity.preview,
  )
    ? {
        projectId: context.sanity.preview.projectId,
        dataset: context.sanity.preview.dataset,
        token: context.sanity.preview.token,
      }
    : undefined;

  const selectedLocale = context.storefront.i18n as I18nLocale;

  return json({
    preview,
    selectedLocale,
  });
}

export default function App() {
  const {preview, ...data} = useLoaderData<typeof loader>();
  const locale = data.selectedLocale ?? DEFAULT_LOCALE;

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Preview preview={preview} fallback={<PreviewLoading />}>
          <Layout key={`${locale.language}-${locale.country}`}>
            <Outlet />
          </Layout>
        </Preview>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

```tsx
export default function Index() {
  // get initial data
  const {homepage} = useLoaderData<typeof loader>();
  // conditionally render preview-enabled component (see below)
  const Component = usePreviewComponent(Route, Preview);

  return <Component homepage={homepage} />;
}

function Route({homepage}) {
  return (
    <>
        {/* ...render homepage using data */}
    </>
  );
}

function Preview(props) {
  const {usePreview} = usePreviewContext()!;
  const homepage = usePreview(`*[_type == "home"][0]`, undefined, props.homepage);

  return <Route homepage={homepage} />;
}
```

## Limits

The real-time preview isn't optimized and comes with a configured limit of 3000 documents. You can experiment with larger datasets by configuring the hook with `documentLimit: <Integer>`. Be aware that this might significantly affect the preview performance.
You may use the `includeTypes` option to reduce the amount of documents and reduce the risk of hitting the `documentLimit`:

## License

[MIT](LICENSE) © Sanity.io <hello@sanity.io>
