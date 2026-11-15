# Querying and caching

Read this when the task touches `fetch`, TypeGen, the app cache or cache invalidation.

## `fetch`

`context.get(sanityContext).fetch({query, params, tags, cache, stega, perspective})` returns
`{data, syncTags, sourceMap?}`. It makes one API call per query.

| Request state      | What the SDK does                                                                    |
| ------------------ | ------------------------------------------------------------------------------------ |
| Production         | API CDN, `perspective: 'published'`, `cacheMode: 'noStale'`, no stega, app cache on   |
| Preview            | Live API, server token, preview perspective and variant, stega if `studioUrl`, no app cache |
| After a live event | As production, plus `lastLiveEventId`; app cache skipped for that request            |

## Types

Wrap the query in `defineQuery` and run `sanity typegen generate`. TypeGen registers the result
type, and `fetch` infers it. Without TypeGen, pass the type: `fetch<Page | null>({query})`.

## App cache

```ts
import {kvCache, memoryCache, webCache} from 'react-router-sanity/cache'

cache: {store: memoryCache()}                                  // Node, dev
cache: {store: webCache({cache: () => caches.open('sanity')})} // Oxygen, Cloudflare (one data center)
cache: {store: kvCache({store: env.SANITY_KV})}                // Workers KV, global
```

Default strategy: `{maxAge: 3600, staleWhileRevalidate: 86400}` when `live.secret` is set and the
store purges globally (`kvCache`); `{maxAge: 10, staleWhileRevalidate: 50}` otherwise.
`memoryCache` and `webCache` purge only one process or data center, so they keep the short TTL
unless you set `strategy` yourself. Override per call with
`fetch({query, cache: {maxAge: 60, staleWhileRevalidate: 600}})`, or skip with `cache: false`.

## Invalidation

Mount the live route and deploy a Sync Tag Invalidate Function. See `live.md`.

## Observability

Each response has `Server-Timing: sanity;desc="hit=… stale=… miss=… bypass=…";dur=<API ms>`.

## CDN tag headers (opt-in)

`cdnTags: {header: 'Cache-Tag'}` writes the sync tags of the response, plus a dataset tag, as a
header. Purge by tag in `live.onInvalidate`. Preview responses never carry the header.
