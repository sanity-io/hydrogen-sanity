# Migrating from v7 to v8

v8 requires Hydrogen 2026.10 and removes the APIs that 7.x deprecated. On Hydrogen 2026.4 and earlier, stay on `hydrogen-sanity` 7.x.

Hydrogen 2026.10 removes `createHydrogenContext`, `HydrogenAdditionalContext`, `createWithCache`, `CacheLong()`/`CacheShort()`/`CacheNone()`, `HydrogenSession` and the Subrequest Profiler. Upgrade Hydrogen first, then change the Sanity setup below. The [README](./README.md#usage) and the [example storefront](../../examples/storefront) have the complete setup.

## Install

```sh
npm install hydrogen-sanity@^8
```

## Set `context.sanity` in `server.ts`

Move `createSanityContext` out of `createHydrogenRouterContext` into its own module, for example `app/lib/sanity/context.ts`. Pass it the router context's `cache` and `waitUntil`:

```ts
// ./server.ts
routerContext.sanity = await createRequestSanityContext(
  request,
  env,
  routerContext.cache,
  routerContext.waitUntil,
)
```

Set it in `server.ts`, not in the root `middleware`. `hydrogen-sanity/preview/route` reads `context.sanity` as a property, and with middleware enabled React Router types the context as read-only inside middleware, which stores values with `context.set()` instead.

Replace the `HydrogenAdditionalContext` augmentation with a `sanity: SanityContext` property on the router context type in `env.d.ts`.

The `cache` option accepts Hydrogen's `CacheInstance`, so the router context's `cache` passes through as is.

## Initialize the preview session in the Sanity module

Call `PreviewSession.init(request, [env.SESSION_SECRET])` in the same module, before `createSanityContext`. There is no `AppSession` to initialize next to it.

## Rename cache strategies

| Hydrogen 2026.4 | Hydrogen 2026.10 |
| --------------- | ---------------- |
| `CacheLong()`   | `Cache.long()`   |
| `CacheShort()`  | `Cache.short()`  |
| `CacheNone()`   | `Cache.none()`   |

This applies to `hydrogen.cache` in `query`, `loadQuery` and `fetch`, and to the `defaultStrategy` option. The default stays `Cache.long()`.

## Remove deprecated options

v8 removes the `hydrogen.debug` option from `query`, `loadQuery` and `fetch`. Hydrogen 2026.10 has no Subrequest Profiler, so the option had no effect. Delete it from your calls.

The `refreshDefault` callback of the `refresh` prop on `VisualEditing` and `Overlays` no longer reads the deprecated `livePreviewEnabled` flag from Studio. It skips revalidation for mutations when a `Query` component or `useQuery` hook is mounted, and revalidates in all other cases.

## Read fresh content from the API CDN

`query` and `fetch` now send `cacheMode: 'noStale'`, so the API CDN doesn't return stale content. Hydrogen's cache already serves stale content while it revalidates.

Remove `useCdn: false` and `useCdn: process.env.NODE_ENV === 'production'` from your client configuration, and keep the client's default `useCdn: true`. The option applies only to API CDN requests. In preview mode, `hydrogen-sanity` uses the live API.

To opt out for one request, pass `cacheMode: undefined`.

## Remove the client-side `studioUrl`

`<VisualEditing>` and `<LiveMode>` now read `studioUrl` from the server client's `stega.studioUrl` when it's a string. Remove the `studioOrigin` value from the root loader and the `studioUrl` prop:

```diff
- <VisualEditing action="/api/preview" studioUrl={data?.studioOrigin} />
+ <VisualEditing action="/api/preview" />
```

Keep passing a `stega.filter` function, or a function-valued `studioUrl`, as a prop. Functions can't cross from the server.

## Check `shouldCacheResult` in `fetch` and `query`

7.x ignored `hydrogen.shouldCacheResult` in `fetch`, and so in `query` outside preview mode. v8 applies it, and the callback receives the query result. If your callback expects `{data}`, read the result directly instead.

## Expect a cold cache after the deploy

Cache entries now include the method, project, dataset, API version, perspective and stega setting. v8 doesn't read the entries that 7.x wrote, so the first requests after the deploy fetch from Sanity.

## Read `query` results in loaders with `isQueryResponseInitial`

In preview mode `query` returns `{data, sourceMap, perspective}`. To check the result in a loader, use the new `isQueryResponseInitial` guard. See [Using `query` and `Query` together](./README.md#recommended-using-query-and-query-together).

## `loadQuery` no longer sets `@sanity/react-loader`'s server client

`loadQuery` fetches with the request's own client, so concurrent requests don't share a client. If your app also calls `loadQuery` from `@sanity/react-loader` directly, call `setServerClient` yourself.

## Update the Content Security Policy

`createContentSecurityPolicy` takes `{shop, directives}` and returns `csp.applyResponseHeaders()`. Hydrogen merges `directives` with the Shopify sources, so list only the Sanity sources. See [Modify storefront's Content Security Policy](./README.md#modify-storefronts-content-security-policy-csp).

## If you use `@sanity/client` with `withCache`

Replace `withCache.run()` with `createRunWithCache({cache, waitUntil})`. The callback returns `{data, shouldCache}`, and Hydrogen caches only plain objects, so wrap the query result in `data`. See [Using `@sanity/client` directly](./README.md#using-sanityclient-directly).
