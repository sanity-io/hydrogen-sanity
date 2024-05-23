# Migrating from v3 to v4

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
+ import {VisualEditing} from 'hydrogen-sanity/visual-editing'
```

Update root loader and default export to remove the old `PreviewProvider` and replace it with the conditionally imported `VisualEditing` component:

```tsx
// ./root.tsx

// Preview config no longer needs to be returned from the Loader
export async function loader({context}: LoaderArgs) {
  return json({
    // ... other loader data
    // Return a boolean for if the app is in preview mode
    preview: context.sanity.preview?.enabled,
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
