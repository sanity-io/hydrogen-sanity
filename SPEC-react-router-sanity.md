# Spec: `react-router-sanity`

Status: **draft for decision** · 2026-11-15 · Supersedes nothing. Builds on
`PREWORK-react-router-sanity.md` (measurements, architecture verdict) and `V7-PLAN.md`.

A Sanity SDK for React Router framework mode. It replaces the React Router layer of
`hydrogen-sanity` and works with or without Shopify Hydrogen. Section 11 lists the decisions
that block implementation. Section 10 lists proposed scope additions for you to accept or reject.

---

## 1. Context

- **Hydrogen is now a server-handler library, not a framework.** Hydrogen 2026.10 (2026-10-09,
  now 2026.10.3) removed `createWithCache`, `CacheLong`, `hydrogenPreset`, `storefrontRedirect`,
  `useNonce`/`NonceProvider` and the `react-router` peer. React Router is one template among
  Next.js, Nuxt, Astro, SvelteKit and SolidStart (`Shopify/hydrogen` `templates/react-router`).
- **The Hydrogen template plugs into React Router primitives.** `server.ts` builds a
  `RouterContextProvider`, sets `cache` and `waitUntil` on it, and a root `export const middleware`
  calls `context.set(storefrontClientContext, client)`. A third-party SDK plugs in at the same
  point. No Hydrogen API is needed.
- **`hydrogen-sanity` 7.0.0 is coupled to Hydrogen at two seams only** (PREWORK, "Extraction"):
  the cache seam (`createWithCache`, `CacheLong`) and the `context.sanity` convention on
  `AppLoadContext`. All of `visual-editing/**`, `preview/**`, `image.ts` and `Query*` are already
  generic React Router.
- **Issue #145** ("Official React Router v7 toolkit") asks for this package. The reporter runs
  `hydrogen-sanity` on Cloudflare Workers without Hydrogen today.
- **No package exists.** `react-router-sanity`, `@sanity/react-router` and `@sanity/remix` all 404
  on npm. `sanity-io/sanity-template-react-router-clean` hand-rolls the integration in about 7 files.
  `sanity-io/lcapi-examples` lists React Router as TODO.
- **React Router state (2026-11-14):** 8.5.1 is stable. 8.0.0 (2026-06-17) made middleware and
  `RouterContextProvider` mandatory, removed `AppLoadContext` and `react-router-dom`, and set
  Node `>=22.22.0` and React `>=19.2.7`. Middleware and `createContext()` are stable since
  7.9.0 behind `future.v8_middleware`. RSC is still `unstable_` and churns in minors.

## 2. Goals and non-goals

### Goals (from the brief)

| #   | Requirement                                                                                                                | Required |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| G1  | Querying, with an app-cache affordance on top of the API CDN's `cacheMode=noStale`                                         | yes      |
| G2  | Live Content API: client-side (live UI parts) and server-side (Sync Tag Invalidate Function)                               | optional |
| G3  | Presentation: routing, events, perspectives, variants, preview mode, overlays, every progressive-enhancement level         | yes      |
| G4  | Images, video, files for dataset assets and Media Library assets                                                           | optional |
| E1  | Discoverable import paths that tree-shake                                                                                  | yes      |
| E2  | Lowest production bundle cost; preview code loads only in preview; a harness measures and enforces it                      | yes      |
| E3  | Secure preview and Presentation sessions                                                                                   | yes      |
| E4  | Two in-repo example apps: vanilla React Router and the Shopify Hydrogen template; E2E runs against both                    | yes      |
| E5  | Agent experience (AX): token-efficient primitives, STE TSDoc on functions and types, evals that measure it, shipped skills | yes      |
| E6  | Content Security Policy: a Sanity CSP utility for Hydrogen and plain React Router; every feature works under a strict nonce policy (section 6.1) | yes      |

**Correction to the brief:** the CDN parameter is `cacheMode=noStale` (`@sanity/client`
option `cacheMode: 'noStale'`), not `mode=no-stale`. The client sends it only when `useCdn` is
true. `next-sanity` omits it for non-`published` perspectives and during the production build.

### Non-goals

- **A blocking RSC gate.** React Router RSC is `unstable_` at 8.5.1 and broke adopters in
  7.14.0 and 8.3.0. The package is RSC-ready from day one (section 4.3: `react-server`
  conditions, `'use client'` directives, a non-blocking RSC example in CI), but an RSC failure
  does not block a release until React Router marks RSC stable (D9).
- **Studio-side Presentation config.** `resolve.locations` and `mainDocuments` live in
  `sanity/presentation`. The front end implements nothing for them.
- **Shopify-specific Studio plugins** (`packages/sanity-config`). They stay with `hydrogen-sanity`.
- **A user-facing starter.** React Router templates live outside the main repo
  (`remix-run/react-router-templates`). A `sanity-template-react-router` repo comes after GA.
  The in-repo examples are test playgrounds (E4).

## 3. Design principles

1. **Upstream first.** Depend on `@sanity/client` (fetch, live, stega, `mediaLibrary`),
   `@sanity/visual-editing/react-router` and `/react`, `@sanity/preview-url-secret`,
   `@sanity/image-url`, `@sanity/asset-utils` and `groq`. Write first-party code only where React
   Router needs glue or upstream has a gap. Send each gap upstream as a PR (section 9).
2. **Per-request state through `RouterContextProvider` only.** No module-level or `globalThis`
   state. This removes the cross-request leak in `hydrogen-sanity` `provider.tsx:47` and the
   process-global `setServerClient` from `@sanity/react-loader` by construction.
3. **The production path pays for nothing it does not use.** Every preview, live and media
   feature sits behind its own subpath and behind a dynamic `import()`. The harness (section 7)
   enforces this in CI. Conventions do not.
4. **Tokens never reach the browser by default.** Any feature that needs a browser token is
   opt-in and documented as such.
5. **Platform-neutral cache.** The SDK defines a small cache port. Adapters cover Web Cache API
   (Cloudflare, Oxygen), key-value stores and an in-memory LRU. No platform package is a hard
   dependency.

## 4. Package shape

### 4.1 Entry points

Each row is an `exports` subpath. "Prod" says whether a production, non-preview request can
evaluate the module.

| Subpath                              | Contents                                                                                                                                       | Runs on | Prod |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| `react-router-sanity`                | Types, `defineQuery`/`groq`, `stegaClean`, `sanityContext` key. No runtime dependencies beyond `groq`.                                         | both    | yes  |
| `react-router-sanity/server`         | `createSanityMiddleware`, `fetch`, preview state, tag collection, response-header helpers. `browser` condition resolves to a stub that throws. | server  | yes  |
| `react-router-sanity/cache`          | Cache port + adapters: `webCache`, `kvCache`, `memoryCache`. Tag index for tag invalidation.                                                   | server  | yes  |
| `react-router-sanity/preview/route`  | Resource-route `loader`/`action`: enable, disable, change perspective and variant. Wraps `validatePreviewUrl`.                                 | server  | no   |
| `react-router-sanity/preview`        | `usePreview()` hook (enabled, perspective, variant) read from root loader data. Tiny.                                                          | both    | yes  |
| `react-router-sanity/visual-editing` | `<VisualEditing enabled>`. Lazy wrapper around `@sanity/visual-editing/react-router`, wired to the perspective/variant action.                 | client  | no\* |
| `react-router-sanity/optimistic`     | `useOptimistic`, `useDocuments`, `usePresentationQuery`, `useIsPresentationTool` (re-exports from `@sanity/visual-editing/react`).             | client  | no   |
| `react-router-sanity/live`           | `<SanityLive>`: lazy client component on `client.live.events`. Revalidates matching routes.                                                    | client  | opt  |
| `react-router-sanity/live/route`     | Authenticated resource route for the Sync Tag Invalidate Function. Purges app cache and optional CDN tags.                                     | server  | opt  |
| `react-router-sanity/image`          | `<SanityImage>` (srcset, sizes, hotspot/crop, LQIP/thumbhash placeholder), `urlFor`.                                                           | both    | opt  |
| `react-router-sanity/video`          | `<SanityVideo>`, `<SanityBackgroundVideo>` on Mux Player (optional peer). Public playback IDs.                                                 | client  | opt  |
| `react-router-sanity/media/server`   | `getPlaybackInfo` loader helper (private video), image/file URL signing, aspect projection fragments.                                          | server  | opt  |
| `react-router-sanity/csp`            | `getSanityCspDirectives(context)`, `createSanityCspDirectives`, `serializeCsp`, `createNonce`. Hydrogen-compatible directives. See 6.1.          | server  | yes  |

\* The `visual-editing` module is imported in `root.tsx`, so its eager wrapper ships to every
visitor. The wrapper must stay under the budget in section 7.2 (target: 1 KB gzip, measured
today at 817 B for the upstream lazy shim). Everything behind it loads only when `enabled`.

### 4.2 Package rules

- ESM only. `exports` with `types` inside each entry; no `typesVersions`. Add `module-sync`
  (universal on `@react-router/*`). `sideEffects: false`.
- Server-only entries carry a `browser` (and `default` where needed) condition that resolves to
  a module that throws on import with a clear message. This copies `next-sanity/live` and the
  `@sanity/astro` token-client stub. A misplaced import fails at build, not at runtime in prod.
- Peers: `react-router` (D2), `react`/`react-dom` `^19.2.7`, `@sanity/client` (current major),
  optional `@mux/mux-player-react`.
- Build with tsdown (React Router and the `pkg-utils` successor use it). Run `publint --strict`
  and `attw --profile esm-only` in CI.

### 4.3 Rendering modes and export conditions

The SDK must behave correctly in every React Router rendering mode, and must resolve the
correct module under every export condition a bundler can apply.

**Rendering modes**

| Mode                                              | Server loaders              | Middleware         | SDK support                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSR (`ssr: true`)                                 | yes                         | `middleware`       | Full. Reference mode for every feature.                                                                                                                                                                                                                                                                        |
| SSR + streaming (`Await`, deferred promises)      | yes                         | `middleware`       | `fetch` returns a promise that a loader can return unawaited. Sync tags of deferred queries arrive after the response headers, so they reach `<SanityLive>` through the resolved data but **not** the CDN tag header (P1). Document this. Overlays and stega work on streamed content (`hydrogen-sanity` #74). |
| Prerender (`prerender`, with `ssr: true`)         | build + runtime             | `middleware`       | Build-time `fetch` uses the production path; the app cache is irrelevant. Preview and live revalidation need the runtime server, so a prerendered route falls back to SSR when a preview cookie is present.                                                                                                    |
| SPA / static (`ssr: false`, optional `prerender`) | no                          | `clientMiddleware` | Query only: `fetch` from `clientLoader` with a tokenless, published, CDN client. No preview, no server live, no signing. `<SanityLive>` works (revalidates client loaders). Document the limits.                                                                                                               |
| RSC framework mode (`unstable_`)                  | yes, plus server components | `middleware`       | RSC-ready (below). Server components call `context.get(sanityContext).fetch()` directly. Client components keep `'use client'`. Non-blocking CI until D9.                                                                                                                                                      |

**Export conditions.** Each entry declares its behaviour per condition. Order in `exports`:
`react-server` → `browser` → `workerd`/`worker` (only where a runtime differs) → `default`.

| Entry                                                                         | `react-server`                                     | `browser`            | `default` (SSR, node, workerd) |
| ----------------------------------------------------------------------------- | -------------------------------------------------- | -------------------- | ------------------------------ |
| `.`                                                                           | same (no hooks)                                    | same                 | same                           |
| `/server`, `/cache`, `/preview/route`, `/live/route`, `/media/server`, `/csp` | real module                                        | **throws on import** | real module                    |
| `/preview`                                                                    | `getPreview(context)` (no hooks)                   | `usePreview()`       | `usePreview()`                 |
| `/visual-editing`, `/live`, `/optimistic`, `/video`                           | `'use client'` reference                           | real module          | real module                    |
| `/image`                                                                      | server-safe `<SanityImage>` (no state, no effects) | same                 | same                           |

- Client-component entries keep a top-of-file `'use client'` directive in `dist`. The directive
  is inert outside RSC. **Verify** that tsdown preserves directives per chunk; if it does not,
  add a post-build step and a test.
- No entry under `react-server` may import `react-dom/client`, use hooks, or touch `window`.
- Data that crosses into client components (sync tags, preview state, client config) travels as
  serializable props, not React context created on the server.
- In RSC mode, refresh after a Presentation event uses React Router's RSC revalidation. The
  upstream `/react-router` adapter calls `useRevalidator`; **verify** that it triggers an RSC
  payload refetch in RSC mode, and send an upstream fix if not.

## 5. Feature specification

### 5.1 Request context and querying (G1)

**Setup.** One root middleware creates a per-request Sanity context. Configuration is a function
of the request, because Workers and Oxygen expose `env` per request.

```ts
// app/lib/sanity.server.ts
import {createClient} from '@sanity/client'
import {createSanityMiddleware} from 'react-router-sanity/server'
import {webCache} from 'react-router-sanity/cache'

export const sanityMiddleware = createSanityMiddleware(({context}) => {
  const env = context.get(envContext)
  return {
    client: createClient({
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      apiVersion: '2026-11-01',
      useCdn: true,
    }),
    serverToken: env.SANITY_VIEWER_TOKEN, // never serialized
    studioUrl: env.SANITY_STUDIO_URL,
    preview: {sessionSecrets: [env.SANITY_PREVIEW_SECRET]},
    cache: webCache({cache: () => caches.open('sanity'), waitUntil: context.waitUntil}), // optional
  }
})

// app/root.tsx
export const middleware = [sanityMiddleware]

// app/routes/page.tsx
import {sanityContext} from 'react-router-sanity'
export async function loader({context, params}: Route.LoaderArgs) {
  const sanity = context.get(sanityContext)
  const {data} = await sanity.fetch({query: PAGE_QUERY, params})
  return {page: data}
}
```

**`sanity.fetch({query, params, tags?, cache?, stega?, perspective?})`** returns
`{data, syncTags, sourceMap?}`. Behaviour:

| Request state              | Client config                                                                                                     | App cache  | Stega             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- | ----------------- |
| Production                 | `useCdn: true`, `perspective: 'published'`, `cacheMode: 'noStale'`, `filterResponse: false`, `returnQuery: false` | read/write | off               |
| Preview                    | `useCdn: false`, server token, perspective + variant from the preview session                                     | bypass     | on if `studioUrl` |
| Production + live event id | as production, plus `lastLiveEventId`                                                                             | bypass     | off               |

- One API call per query. `filterResponse: false` returns `syncTags` in the same response, so
  the two-request pattern in `next-sanity` (one call for tags, one for data) is not needed.
- **Cache key** = hash of `query`, `params`, `apiVersion`, `perspective`, `variant` and
  `projectId/dataset`. The `hydrogen-sanity` key omits perspective (`utils.ts:31`); the new key
  must not.
- **Cache entry** stores `{data, syncTags, fetchedAt}`. The tag index maps each sync tag to keys.
- **Strategy** per call or per context: `{maxAge, staleWhileRevalidate}`. Default: long TTL with
  stale-while-revalidate when an invalidation path exists (section 5.4), short TTL otherwise.
  Revalidation runs in `waitUntil` when the platform has it, and inline otherwise (the shape of
  Hydrogen's `createRunWithCache`).
- **Tag collection.** The middleware collects the `syncTags` of every `fetch` in the request.
  Two consumers: the root loader exposes them to `<SanityLive>` (5.4), and an opt-in response
  helper emits them as a CDN tag header (D6).
- `sanity.client` gives the raw configured client for cases `fetch` does not cover.
- **One query function only.** PREWORK proved `loadQuery` is not needed as public API. The
  `query`/`fetch`/`loadQuery` trio from `hydrogen-sanity` collapses into `fetch`. This also
  removes the `this`-receiver bug at `context.ts:358`.

**Cache port** (`react-router-sanity/cache`):

```ts
interface SanityCache {
  get(key: string): Promise<CacheEntry | undefined>
  set(key: string, entry: CacheEntry, opts: {ttl: number; tags: string[]}): Promise<void>
  invalidateTags?(tags: string[]): Promise<void> // absent = TTL-only invalidation
}
```

Adapters: `webCache` (Cache API; Cloudflare, Oxygen; tag index stored beside entries),
`kvCache` (any `get/put/delete` store: Workers KV, Redis, Vercel Runtime Cache, which has native
tags), `memoryCache` (LRU, dev and Node). The port is the only cache contract. A consumer can
write an adapter in about 20 lines.

### 5.2 Preview session (G3, E3)

**Enable flow** (`preview/route` loader, `GET /api/preview?sanity-preview-secret=…`):

1. Build a client with the server token and `useCdn: false`.
2. `validatePreviewUrl(client, request.url)`. On failure, return 401 with no detail.
3. Optional: check `studioOrigin` against `preview.allowedStudioOrigins` (P8).
4. Write the session: `projectId`, `dataset`, `perspective` (default `drafts`), `variant`.
5. Redirect 307 to `redirectTo`. Upstream already restricts it to a relative path.

**Session cookie:**

- Signed (`createCookieSessionStorage` with `secrets` rotation), `HttpOnly`, `Secure`,
  `SameSite=None`, `Path=/`.
- **`Partitioned` (CHIPS)** when the request is a cross-site iframe
  (`sec-fetch-dest: iframe` and `sec-fetch-site: cross-site`), with a companion flag cookie so
  later writes keep the partition. This copies `next-sanity` (sanity#12806) and fixes
  `hydrogen-sanity` #193.
- `secure: false` and `SameSite=Lax` only on `localhost` in dev.
- Cookie names come from `@sanity/preview-url-secret/constants`. A `cookieName` option covers
  #120 (namespacing).

**Session port.** The SDK reads and writes the session through a 4-method port (`get`, `set`,
`unset`, `commit`). The default implementation uses React Router cookie session storage. A
Hydrogen app can pass `ShopifyRouteSessionManager`, which matches the shape. This replaces the
`HydrogenSession` duck-typing (`utils.ts:132-145`).

**`Set-Cookie` handling.** The middleware appends cookies with `headers.append` after `next()`.
It never uses `headers.set`. PREWORK confirmed that `set` in `examples/storefront/server.ts:34`
destroys a middleware-written preview cookie.

**Perspective and variant change** (`preview/route` action, `PUT`): validate the value with
`validateApiPerspective`, require a live session with the same `projectId`, and require an
`Origin` header that matches the request origin (P7). `POST`/`DELETE` exit preview: destroy the
session and redirect to `/`.

**Response hygiene in preview.** The middleware sets `Cache-Control: private, no-store` on every
preview response and strips CDN tag headers. A preview response must never enter a shared cache.

### 5.3 Visual editing and Presentation (G3)

`<VisualEditing enabled={preview.enabled} />` in `root.tsx`:

- **`enabled` prop in the library.** When false, the component renders `null` and imports
  nothing. Today the consumer must write `{previewMode ? <VisualEditing/> : null}`; a consumer
  who forgets ships 188 KB gzip to every visitor (PREWORK). `@sanity/astro` and
  `@sanity/sveltekit` already gate in the library.
- Wraps `@sanity/visual-editing/react-router`: history adapter (push, replace, pop, title),
  `useRevalidator` refresh, SSR-safe `useSyncExternalStore` mount gate. The first-party
  `hooks/history.ts` and `hooks/refresh.ts` are deleted. The `isProgrammaticNavRef` dedup guard
  goes upstream as a PR (section 9).
- Wires `onPerspectiveChange` and `onVariantChange` to the preview action through
  `useFetcher`. Passing both tells Studio that the app handles the change, so Studio does not
  hard-reload the iframe.
- Passes through `components`, `plugins` (upstream gap, section 9), `zIndex`,
  `keepStegaOnCopy`, `onSuspiciousStega` and a custom `refresh`.
- Stega: on only in preview and only when `studioUrl` is set. Production responses never carry
  stega. `createDataAttribute` comes from `@sanity/visual-editing/create-data-attribute` in a
  preview-only path (PREWORK "one decision": it pulls 32 KB of `visual-editing-csm`).

### 5.4 Live content (G2)

Two independent mechanisms. An app can use either, both or neither.

**Server-side: Sync Tag Invalidate Function → app cache.**

- The SDK ships a Function template (`defineSyncTagInvalidateFunction` in
  `sanity.blueprint.ts`) that POSTs `{tags}` to the app, then calls `await done(syncTags)`.
  `done` releases the events to clients connected with `waitFor=function`.
- `live/route` is the receiving resource route. It authenticates the call (HMAC over the body
  with a shared secret, plus a timestamp to stop replays), calls `cache.invalidateTags(tags)`,
  and calls an optional `onInvalidate(tags)` hook for CDN purges (Vercel `invalidateByTag`,
  Netlify `purgeCache`, Cloudflare tag purge, Fastly surrogate keys).
- One function per dataset. Multiple functions on one dataset race (Sanity docs).

**Client-side: `<SanityLive>`.**

- Lazy client component, mounted in `root.tsx`. It subscribes to `client.live.events()`.
- It compares event tags with the sync tags of the current route data (collected by the
  middleware, about 100 short strings at most). On a match it calls `revalidator.revalidate()`.
  It ignores events that do not touch the page.
- **Freshness through the CDN**, two modes:
  - `waitFor: 'function'` when a Sync Tag Invalidate Function is deployed. The event arrives
    after the app cache is purged, so a plain revalidation returns fresh data.
  - `lastLiveEventId` otherwise. `<SanityLive>` sends the last event id with the revalidation
    request. The server passes it to `client.fetch` (CDN cache key) and bypasses the app cache
    for that request. Transport: a search param on the data request or a header; not a cookie,
    because a cookie makes every response private. Clear it on `restart` and `reconnect`
    (Astro pattern in `lcapi-examples`).
- Event handling: `welcome` stops fallback polling; `restart` revalidates all; `reconnect` logs;
  `goaway` falls back to 30 s polling; CORS errors log the "add origin" URL via
  `isCorsOriginError`.
- In preview, `<SanityLive>` hands over to the preview levels in 5.5.

### 5.5 Preview progressive enhancement (G3)

Each level adds to the one below. An app picks a level per route.

| Level | Name                | Mechanism                                                                                                         | Browser token | Extra client JS |
| ----- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- | --------------- |
| L0    | Off                 | Production path                                                                                                   | no            | 0               |
| L1    | Server regeneration | Draft perspective on the server; Presentation `refresh` events call `revalidator.revalidate()` (upstream default) | no            | overlays chunk  |
| L2    | Live drafts         | `<SanityLive includeDrafts>` revalidates on draft sync tags                                                       | see D5        | + live chunk    |
| L3    | Client loaders      | `usePresentationQuery` (or `@sanity/react-loader`, D4): Studio pushes query results per keystroke                 | no            | + loader chunk  |
| L4    | Optimistic          | `useOptimistic` / `useDocuments` for array reorder and drag-and-drop                                              | no            | + optimistic    |

- L1 needs no client data layer. Upstream's default `refresh` skips mutation events when a
  client loader is active, so L1 and L3 coexist on one page.
- L3 keeps the useful part of `hydrogen-sanity`: route components declare their query, and
  auto live mode starts only when a page has an active client query (`useHasActiveLoaders`).
- Release perspectives (arrays) and variants pass through every level unchanged.

### 5.6 Images, video and files (G4)

**Dataset and Media Library images and files.** Studio links a Media Library image or file into
the dataset as a normal `sanity.imageAsset`/`sanity.fileAsset` with a `media` GDR beside `asset`.
The front end resolves both through the dataset CDN with the same code.

- `<SanityImage value={image} sizes="…" />`: builds `src`/`srcset` with `@sanity/image-url`
  (`auto=format`, `fit`, hotspot/crop to `rect`/`fp`), sets `width`/`height` from
  `@sanity/asset-utils` dimensions, `loading`/`fetchpriority`, and an LQIP or thumbhash
  placeholder when the query projects `metadata.lqip`. A `priority` prop adds a preload link
  through the route `links` export helper.
- **Unverified:** whether Media Library-linked image docs populate `metadata.lqip`/`thumbhash`.
  Test before the docs promise placeholders for Media Library images.

**Media Library video** (Enterprise add-on, Mux-backed). The GDR sits in `asset`
(`media-library:<libraryId>:video-<id>-mp4`), and nothing is linked into the dataset.

- Public: GROQ `documents::get(video.asset){...}` returns the playback id and aspect ratio.
  `<SanityVideo>` renders Mux Player with `customDomain="m.sanity-cdn.com"`, a poster from
  `image.m.sanity-cdn.com/{id}/thumbnail.webp`, captions from subtitle tracks, and
  `aspect-ratio` CSS to stop layout shift. `<SanityBackgroundVideo>` covers muted looping heroes.
- Private: `media/server` `getPlaybackInfo(context, ref)` calls
  `client.mediaLibrary.video.getPlaybackInfo` in the loader with the server token and returns
  signed URLs and `expiresAt`. The component refreshes before expiry through revalidation.
- Mux Player is an optional peer. The `video` entry imports it lazily.

**Private Media Library images and files.** `media/server` signs URLs with
`@sanity/image-url/signed` and `@sanity/signed-urls` in the loader. Signatures bind transform
parameters, so each `srcset` width needs a signature; the helper signs the full width set in
one pass.

**Aspects.** Typed GROQ projection fragments for `media::aspect(media, "<name>")`. GROQ only;
no runtime cost. Only aspects marked `public: true` are readable from the dataset.

## 6. Security (E3)

| #   | Threat                                          | Control                                                                                                                                                                                                              |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Unauthorized preview entry                      | `validatePreviewUrl` server-side against Content Lake; secret TTL 1 h. Secrets are not single-use: document that preview URLs must not be logged. Optional `studioOrigin` allowlist.                                 |
| S2  | Token leaks to the browser                      | Server token only in server entries; `browser` condition stub throws; root loader serializes a typed allowlist (`projectId`, `dataset`, `apiVersion`, `studioUrl`, preview state). Unit test asserts no token field. |
| S3  | Cross-request state leaks                       | Per-request `RouterContextProvider` only. Lint rule bans module-level mutable state in `src/`. Concurrency test: two interleaved requests with different preview state.                                              |
| S4  | Preview responses cached publicly               | Middleware forces `Cache-Control: private, no-store` and drops tag headers in preview; app cache bypassed.                                                                                                           |
| S5  | CSRF on perspective change and exit             | Non-GET only; `Origin` check; session `projectId` match; `validateApiPerspective`.                                                                                                                                   |
| S6  | Session tampering                               | Signed cookie with secret rotation.                                                                                                                                                                                  |
| S7  | Third-party cookie blocking breaks Presentation | CHIPS `Partitioned` when cross-site iframe.                                                                                                                                                                          |
| S8  | Forged invalidation calls                       | HMAC + timestamp on `live/route`; reject stale or unsigned bodies.                                                                                                                                                   |
| S9  | XSS through serialized config                   | No inline `<script>` provider. Config travels in loader data, which React Router escapes. Removes the unescaped `JSON.stringify` in `provider.tsx:64`.                                                               |
| S10 | Framing                                         | `getSanityCspDirectives` adds `'self'`, the Studio origin and the Dashboard origin to `frame-ancestors` in preview only. Section 6.1.                                                                               |
| S11 | Stega leaks into production output              | Stega forced off outside preview; E2E asserts no stega characters in production HTML.                                                                                                                                |
| S12 | Signed media keys exposed                       | Signing only in `media/server`; keys never in loader data.                                                                                                                                                           |

### 6.1 Content Security Policy (E6)

Prior art: `hydrogen-sanity` branch `feature/add-csp` (`fdf22e2`, `createSanityCSPHelpers`),
commit `7e82436` (Dashboard in `frame-ancestors`), issue #121, PR #138. Hydrogen 2026.10 keeps
`createContentSecurityPolicy({shop, directives, nonce})`, merges `directives` into its defaults,
and rejects manual nonces. React Router has no CSP helper.

**API** (`react-router-sanity/csp`, server only):

| Export                              | Job                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `getSanityCspDirectives(context)`   | Sanity sources for this request: client config, `studioUrl`, preview state            |
| `createSanityCspDirectives(options)`| The same, from explicit options                                                       |
| `serializeCsp(...sets)`             | Merges camelCase or kebab-case sets into one header; skips empty values (#121)        |
| `createNonce()`                     | 16 random bytes, base64                                                               |

**Sources:**

| Directive        | Value                                                                  | When     |
| ---------------- | ---------------------------------------------------------------------- | -------- |
| `connectSrc`     | `<projectId>.api.<host>`, `<projectId>.apicdn.<host>`                   | always   |
| `imgSrc`         | `cdn.<host>/images/<projectId>/<dataset>/` (path-scoped, no `*`)        | always   |
| `mediaSrc`       | `cdn.<host>/files/<projectId>/<dataset>/`                               | always   |
| `styleSrc`       | `'unsafe-inline'` (ignored by browsers when `style-src` has a nonce)   | preview  |
| `frameAncestors` | `'self'`, Studio origin, `https://www.sanity.io`                        | preview  |

**Rules:**

- Hosts follow `apiHost` and `useProjectHostname`, on the server and in the browser. Root data
  carries a custom `apiHost`, so `<SanityLive>` and the CSP name the same host.
- The result never contains a nonce, so it fits Hydrogen.
- Every feature works under `script-src 'self' 'nonce-…'; style-src 'self' 'nonce-…'`. The
  overlays get the nonce through `<meta property="csp-nonce">`, which `<VisualEditing>` writes from
  the nonce of the React Router scripts. Upstream fix: a `nonce` option in `@sanity/visual-editing`.
- E2E runs the example under that strict policy and asserts zero `securitypolicyviolation`
  events in production, streaming and preview, with a positive control.

**Open:** a nonce makes HTML uncacheable in a shared cache. A nonce-free policy for edge-cached
HTML (P5 "hash-based path") must allow React Router's per-request inline scripts, which hashes
cannot cover. Decide whether the SDK documents `'strict-dynamic'` or leaves edge-cached HTML out.

## 7. Bundle-cost harness (E2)

PREWORK measured the current state and proved two facts that shape this section:

- The cost problem is **module graph and evaluation**, mostly on the server. Bytes barely move
  when an import changes from static to dynamic, because esbuild and the Oxygen worker inline
  `import()` targets.
- `size-limit` on library `dist` is blind to the rule: leaky 87.86 kB vs clean 87.87 kB.

So the harness has two layers: library-graph checks, and consumer-app checks in real builds.

### 7.1 Library layer (runs in the package `build` job)

1. **Static-graph assertion.** Walk each emitted entry in `dist` with `es-module-lexer`. Static
   edges only (`d === -1`). Assert that no prod-reachable entry (section 4.1, "Prod = yes")
   reaches a deny-list: `@sanity/visual-editing`, `@sanity/react-loader`, `@sanity/core-loader`,
   `@sanity/comlink`, `@sanity/presentation-comlink`, `@sanity/visual-editing-csm`,
   `@sanity/preview-url-secret`, `@mux/*`. PREWORK verified this finds exactly the four current
   leaks and ignores the three legitimate `await import()` sites.
2. **Module-evaluation probe.** A Node `module.register()` load hook imports each prod entry and
   asserts zero deny-listed modules evaluated. Only this check survives a bundler that inlines
   `import()`.
3. **Lint.** oxlint `no-restricted-imports` with `allowTypeImports` for fast local feedback.
4. **Package hygiene.** `publint --strict`, `attw --profile esm-only`, and an exports snapshot
   per condition (`vitest-package-exports`, as in `next-sanity`).
5. **Condition-resolution matrix.** For each entry × condition set (`react-server`, `browser`,
   `node`, `workerd`), resolve and import the entry. Assert the expected module, the expected
   throw for server-only entries under `browser`, the `'use client'` directive on client entries,
   and no hooks or `react-dom/client` reachable under `react-server`. This copies the
   `next-sanity` `fixtures/{pass,fail}/server-only-live` idea as a full matrix.

### 7.2 Consumer layer (runs against both example apps, E4)

1. **Production client budget.** Build each example. For a fixture route that uses only
   `fetch` + `<SanityImage>`, sum the gzip size of every chunk in that route's modulepreload
   set that contains SDK or `@sanity/*` code. Budget: SDK share ≤ 3 KB gzip (proposal; current
   `hydrogen-sanity` measures 620 B eager plus image-url). Vite builds with code splitting, so
   byte budgets are valid here.
2. **No preview chunk in production (Playwright).** Load each fixture route in a production
   build with no preview cookie. Record every network request. Assert that no requested chunk
   contains a deny-listed package (map chunks to packages through the Vite manifest or a
   build-time module map).
3. **Preview chunk loads in preview (Playwright).** Enter preview through the real enable route.
   Assert that the overlays chunk loads and the history adapter connects. This proves the gate
   opens, not only that it stays shut.
4. **Server cold-start probe.** Import the built server entry of each example with the load hook
   and count evaluated `@sanity/*` modules for a non-preview request. Assert the count against
   a checked-in baseline.
5. **Report.** CI posts a table per PR: per-entry graph result, client gzip per fixture route,
   server module count, delta from `main`.

Gate rule: steps 7.1.1, 7.1.2, 7.2.2 and 7.2.3 fail the build. Size deltas over budget fail the
build. Small changes under budget only report.

## 8. Example apps and testing (E4)

| App                         | Base                                                            | Runtime                                                                      | Covers                                                                                                               |
| --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `examples/react-router`     | `remix-run/react-router-templates` `default`                    | Node (`@react-router/node`) + `memoryCache`; Cloudflare variant as a stretch | Proves zero Hydrogen dependency. Every SDK feature.                                                                  |
| `examples/hydrogen`         | `Shopify/hydrogen` `templates/react-router` (2026.10.x)         | Oxygen via `@shopify/mini-oxygen/vite`, `webCache` on `caches.open`          | Proves the Hydrogen integration: shared `RouterContextProvider`, shared middleware chain, Shopify session port.      |
| `examples/react-router-rsc` | React Router RSC framework mode (`unstable_`)                   | Node                                                                         | RSC conditions, server-component `fetch`, client-component hand-off, revalidation. **Non-blocking CI job** until D9. |
| `examples/studio`           | Existing Studio, minus Shopify-only plugins for the vanilla app | —                                                                            | Presentation target for both apps; Sync Tag Invalidate Function blueprint.                                           |

- **One E2E suite, two required targets.** Playwright specs live in one place and run per app
  through a project matrix. A spec that only applies to one app (Shopify session) is tagged.
  The RSC app runs the same suite as a third, non-blocking target.
- **Rendering-mode fixtures** in the vanilla app: one route per mode in section 4.3 (SSR,
  streaming, prerender, SPA `clientLoader`). Each fixture runs the production and preview specs
  that apply to it, and asserts the documented limits (for example: SPA route has no preview).
- E2E areas: production query + cache hit/miss (`Server-Timing` header), preview enable/exit,
  401 on bad secret, `Partitioned` cookie in cross-site iframe, perspective switch without
  reload, release perspective, variant switch, overlays click-to-edit target, refresh on
  mutation, `<SanityLive>` revalidation on a published change, invalidation route auth, image
  srcset and placeholder, video poster, no stega in production HTML, the bundle checks in 7.2.
- **Unit tests** (vitest) on the contracts: cache key composition (perspective included), tag
  index, session port, perspective validation, HMAC verification, serialized config allowlist,
  interleaved-request isolation, `syncTags` collection, event-to-route tag matching.
- Examples follow React Router conventions: the 4-script block, the template `tsconfig.json`,
  no Shopify lint inheritance in the vanilla app (PREWORK "Conventions to adopt").

## 9. Upstream work (dedup gate)

| Gap                                                                              | Home                                  |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| `/react-router` does not forward `plugins`; does not export the optimistic hooks | `@sanity/visual-editing`              |
| Programmatic-navigation dedup guard (`isProgrammaticNavRef`)                     | `@sanity/visual-editing/react-router` |
| `nonce` option for overlay styles (today: `meta[property=csp-nonce]` workaround) | `@sanity/visual-editing`              |
| `getProject` drops the CDN host of staging and custom asset URLs                 | `@sanity/asset-utils`                 |
| Parse `media-library:<lib>:<id>` GDR refs                                        | `@sanity/asset-utils`                 |
| Accept GDR refs in `parseSource`                                                 | `@sanity/image-url`                   |
| `client.live` `welcome` event typed without `id`                                 | `@sanity/client`                      |
| React Router entry in `lcapi-examples`                                           | `sanity-io/lcapi-examples`            |

The SDK ships a local shim only until each upstream change lands, and deletes it after.

## 10. Proposed additions (for your decision)

Found during research. Not in the brief. Each has a recommendation.

| #   | Addition                                                                                                                                                                                           | Evidence                                                                                                                                                                | Rec.                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| P1  | **CDN tag headers.** Emit collected sync tags as `Cache-Tag`/`Surrogate-Key`/`Vercel-Cache-Tag`/`Netlify-Cache-Tag`, so whole HTML responses cache at the edge and purge by tag from `live/route`. | Every target CDN supports tag purge; Hydrogen's `applyResponseHeaders` shows the pattern                                                                                | include (opt-in)                 |
| P2  | **TypeGen inference.** `fetch` infers result types from `defineQuery`; `.groq` file support.                                                                                                       | `hydrogen-sanity` PR #195; `next-sanity` re-exports `defineQuery`                                                                                                       | include                          |
| P3  | **Portable Text** subpath re-exporting `@portabletext/react` with block-level data attributes.                                                                                                     | `next-sanity` re-exports it from root                                                                                                                                   | include as own subpath, not root |
| P4  | **Embedded Studio route** (`/studio/*` resource route + client-only Studio).                                                                                                                       | `hydrogen-sanity` PR #112; `next-sanity/studio`                                                                                                                         | defer                            |
| P5  | **CSP helpers.** Promoted to requirement E6 (section 6.1). The hash-based path for cached HTML stays open there.                                                                                    | PR #138; issue #121; branch `feature/add-csp`; Hydrogen `createContentSecurityPolicy`                                                                                   | E6                               |
| P6  | **Preview access sharing.** Support shareable preview links (`sanity.previewUrlShareAccess`).                                                                                                      | `@sanity/preview-url-secret` `toggle-preview-access-sharing`                                                                                                            | include (it is a pass-through)   |
| P7  | **`Origin` check on preview actions.**                                                                                                                                                             | Current CSRF control is `SameSite=None` + `projectId` only                                                                                                              | include                          |
| P8  | **Studio origin allowlist** on enable.                                                                                                                                                             | `validatePreviewUrl` returns `studioOrigin`; README shows the check                                                                                                     | include (opt-in)                 |
| P9  | **Vercel protection bypass** forwarding in preview redirects.                                                                                                                                      | `preview-url-secret` forwards `x-vercel-protection-bypass`                                                                                                              | include                          |
| P10 | **Observability.** `Server-Timing` (cache hit/miss/stale, API ms), request `tag`/`requestTagPrefix` for usage attribution, dev warnings for missing CORS origin.                                   | `@sanity/client` `tag` options; `isCorsOriginError`                                                                                                                     | include                          |
| P11 | **Test utilities.** `createTestSanityContext()` so apps unit-test loaders without network.                                                                                                         | Current suite needs `vi.mock('@shopify/hydrogen')`                                                                                                                      | include                          |
| P12 | **Preconnect hints** via a `links` helper (API, CDN, live hosts).                                                                                                                                  | `next-sanity` calls `preconnect(client)`                                                                                                                                | include                          |
| P13 | **Vite plugin.** Drop it.                                                                                                                                                                          | Plugin replaces `envPrefix` (drops `VITE_*`), hardcodes `react-loader` dist paths, has no tests. Its rxjs fix is not needed once `react-loader` leaves the server path. | drop                             |
| P14 | **React Router preset.** Skip.                                                                                                                                                                     | Presets can only set `react-router.config.ts` options, not routes or plugins                                                                                            | skip                             |
| P15 | **Migration guide + codemod** from `hydrogen-sanity` v7.                                                                                                                                           | Existing users on Hydrogen 2026.4.x                                                                                                                                     | guide yes, codemod defer         |
| P16 | **Refresh-strategy fallback** for full reloads (Astro `experimental_refreshStrategy`).                                                                                                             | Only needed when revalidation is not possible                                                                                                                           | skip                             |

## 11. Decisions needed

Each decision has a recommendation and the evidence behind it.

**D1. Package home.** Recommend: new package `packages/react-router-sanity` in this monorepo.
`hydrogen-sanity` v8 becomes a thin layer on top (Hydrogen session port, `webCache` preset,
re-exports). `hydrogen-sanity` v7 stays the maintenance line for classic Hydrogen 2026.4.x.
Alternative: a new repo. That loses the 122 existing tests and the release tooling.

**D2. React Router peer range.** Recommend `^7.9.0 || ^8.0.0`, with
`future.v8_middleware: true` required on 7.x (dev-time assertion). Evidence: the Hydrogen
2026.10 template ships RR **7.15.1** with the flag, and `@vercel/react-router` 1.3.7 peers
`@react-router/dev: 7`. A `^8`-only peer excludes the Shopify template (E4) and Vercel today.
This updates PREWORK's "plan on `^8`", which predates Hydrogen 2026.10. Node floor: `>=22.12`
(Node 20 is EOL).

**D3. Middleware-first.** Recommend: the SDK is a middleware plus a typed context key. PREWORK
deferred middleware until "Hydrogen moves context creation into middleware". Hydrogen 2026.10
does exactly that, and RR 8 makes middleware mandatory, so the deferral condition is met. The
two remaining PREWORK objections have fixes: the `Set-Cookie` collision (append, 5.2), and the
error path where root loader data is missing (`usePreview()` returns `enabled: false` in an
error boundary; the error page renders without overlays).

**D4. Client-loader engine for L3.** Recommend `usePresentationQuery` from
`@sanity/visual-editing/react`, behind our own `useQuery` facade. `@sanity/react-loader` is the
legacy path and carries the process-global `setServerClient`. Risk: `usePresentationQuery` is
`@alpha`. The facade keeps the swap cheap if it changes.

**D5. Live drafts token model (L2).** Options: (a) opt-in `browserToken` (Viewer role) sent to
the browser only in preview, as `next-sanity` and Nuxt do; (b) a server-side SSE proxy route so
no token reaches the browser; (c) no L2, rely on Presentation refresh events. Recommend (a) as
opt-in with (c) as the default. (b) holds one long-lived connection per editor on the app
server; on Workers that is allowed but billed by duration. Your call on whether (b) is worth
building.

**D6. CDN tag headers (P1).** Recommend opt-in. It makes full-page edge caching with exact
purges possible on every target CDN, but header size grows with tags (≤ 100 per query, more per
page). Header limits differ per CDN; the helper truncates to a type tag or dataset tag past a
limit.

**D7. Media scope.** Recommend: images + files in M5, video in M5 behind the optional Mux peer,
private signing in M5. Upstream GDR parsing first (section 9).

**D8. Package name.** `react-router-sanity` matches `next-sanity` and `hydrogen-sanity`.
`@sanity/react-router` matches the newer `@sanity/astro` and `@sanity/sveltekit`. No technical
difference. Your call.

**D9. RSC support level.** Options: (a) RSC-ready: conditions, directives, condition matrix
and a non-blocking RSC example (section 4.3); (b) RSC as a release gate now; (c) ignore RSC.
Recommend (a). Evidence: RSC is `unstable_` at 8.5.1, its docs warn of breaking changes in
minors and patches, and 8.5.0 changed RSC middleware short-circuiting. (b) ties our release
cadence to that churn. (c) risks an export-map redesign later, which is a breaking change. (a)
costs one extra example and one CI job. Promote to (b) when React Router drops `unstable_`.

**D10. SPA mode scope.** Recommend query-only support (section 4.3) with documented limits.
Full preview in SPA mode needs a token in the browser or an external server, which conflicts
with principle 4.

**D11. Eval harness.** Recommend AILF (`@sanity/ailf`). It is the org standard: Sanity UI v5,
App SDK, Workflows and Runtime use it, it has an Agent Harness mode (sandboxed Claude Code with
file, diff and command assertions), and it reports Floor/Ceiling/Actual. Alternatives:
`vercel-labs/agent-eval` (compared against AILF in #rd-adx-internal) or a custom harness on the
Claude Agent SDK. A custom harness duplicates AILF's reporting.

**D12. STE enforcement level.** Options: (a) heuristic lint (sentence length, passive voice,
banned-word list) plus an LLM rubric in AILF; (b) a full ASD-STE100 dictionary check; (c) review
only. Recommend (a). (b) needs a licensed dictionary and flags every technical name. (c) drifts:
the UI v5 README already contradicts its own skill on the Checkbox `label` prop.

**D13. Skill distribution.** Recommend in-package (`skills/` in the npm tarball, version-matched,
as UI v5 does) plus a pointer skill in `sanity-io/agent-toolkit` that tells agents to read the
installed copy. A toolkit-only skill drifts from the installed version.

**D14. `doctor` CLI.** Recommend include (section 12.5). It turns silent misconfiguration into
an agent-readable report. Cost: one `bin` entry, no runtime cost for apps.

## 12. Agent experience (E5)

Modelled on the Sanity UI v5 method (PJ Onori's design-system team; `sanity-io/ui` branch
`v5-alpha`; `sanity.io/engineering/design-system-evals`), with three gaps filled: UI v5 has no
token measurement, no TSDoc or STE lint, and no eval of the skill itself.

Evidence that the method works: on Haiku, UI5 build success went from 4% (UI3) to 73% after the
docs-schema change; the blog reports Sonnet 20% → 90% and Opus 40% → 100% (n = 30). The latest
AILF run on `v5-alpha` scores 81/100, with a Retrieval Gap of 30: agents still fail to find the
docs that would help them. Docs alone plateau; API changes and structured guidance move the
score more.

### 12.1 API surface principles

1. **Few primitives, one job each.** The public surface is `createSanityMiddleware`,
   `sanityContext`, `sanity.fetch`, the preview route, `<VisualEditing>`, `<SanityLive>`,
   `<SanityImage>`, `<SanityVideo>`. Each entry exports the fewest values that cover its job. The
   harness reports the count of value exports per entry (section 12.3).
2. **Use names that models already know.** Keep upstream names unchanged (`perspective`, `stega`,
   `syncTags`, `useCdn`, `cacheMode`, `studioUrl`). Use React Router names (`middleware`,
   `context.get`, `loader`, `revalidate`). Do not invent synonyms. UI v5 mirrors CSS property
   names for the same reason.
3. **One way to do each thing.** `hydrogen-sanity` has `query`, `fetch` and `loadQuery`. The new
   surface has `fetch`. Every removed alternative goes into the skill's "wrong → right" table.
4. **Wrong guesses fail `tsc`.** Literal unions for perspectives and modes; the template literal
   `` `s1:${string}` `` for sync tags; no `any` in public types; server-only entries throw under
   `browser`, so a client import fails at build. UI v5 makes padding on `Card` a type error for
   the same reason.
5. **Safe defaults.** The minimal setup is correct and secure. An agent never needs to write a
   default value. A security-relevant option (browser token, CDN tag headers) is opt-in.
6. **Errors are instructions.** Each thrown error and dev warning states the cause and the fix in
   STE, and carries a stable code (`RRS0xx`) that links to a docs page. Agents read error text
   first.
7. **The installed package is the source of truth.** The npm tarball ships `src`, `docs/`,
   `skills/` and `llms.txt` (UI v5 `package.json` `files`). The skill tells agents that the
   installed package beats web docs.

### 12.2 Documentation contract

- **Every exported function, type, interface, property and union member** has a TSDoc comment.
  UI v5 documents prop types but leaves functions at `/** @public */`; this SDK documents both.
- **Style: ASD-STE100.** Active voice, present tense, one idea per sentence, ≤ 20 words per
  instruction and ≤ 25 per description. The first sentence starts with a verb in third person
  ("Returns…", "Sets…", "Enables…"). Technical names stay verbatim.
- **Tags:** `@param`, `@returns`, `@throws` (with the error code), `@defaultValue`, `@see`, a
  release tag (`@public`, `@beta`, `@alpha`, `@internal`), and one minimal `@example` on each
  entry-level function and component.
- **Example of the target style:**

  ```ts
  /**
   * Fetches a GROQ query for the current request.
   *
   * In production, the client reads from the API CDN with `cacheMode: 'noStale'` and uses the app
   * cache. In preview, the client reads from the live API with the server token and skips the cache.
   *
   * @param options - The query, its parameters, and per-call overrides.
   * @returns The result, the sync tags of the result, and the source map in preview.
   * @throws RRS010 when the Sanity middleware is not registered on the root route.
   * @public
   */
  fetch<Q extends string>(options: FetchOptions<Q>): Promise<FetchResult<Q>>

  /** Sets the tags that invalidate a cached result. The SDK adds the sync tags of the result. */
  tags?: string[]
  ```

- **Guideline levels.** Docs and the skill use the UI v5 level vocabulary (`must`, `should`,
  `may`, `should-not`, `must-not`, each with an alternative). Do not adopt the DSDS YAML schema
  itself: it targets UI components, not SDK functions.
- **Generated, not hand-written:** the API reference (TypeDoc JSON, the format
  reference.sanity.io consumes), `llms.txt` (an index of one line per entry and guide), and a
  `.md` twin for each docs page.
- **Drift guards:** every code block in README, docs and skill compiles against `dist` in CI.
  The skill states the package version it was verified against, and CI fails when that version
  falls more than one minor behind.
- **Enforcement (D12):** a doc-coverage check over the emitted `.d.ts` (each export and member
  has a comment), TSDoc syntax validation (`@microsoft/tsdoc` parser), an STE heuristic lint, and
  an AILF rubric criterion that grades doc clarity.

### 12.3 Token efficiency (measured)

UI v5 gets token efficiency by design but does not measure it. This SDK measures it.

| Metric                                                | What it shows                                   |
| ----------------------------------------------------- | ----------------------------------------------- |
| Tokens per entry `.d.ts`                              | Cost for an agent to read the types of an entry |
| Tokens of `llms.txt`, `SKILL.md`, each reference file | Cost of the guidance layer                      |
| Value exports per entry                               | Surface size (principle 12.1.1)                 |
| Input and output tokens per eval task                 | Cost for an agent to finish real work           |

- Count with one pinned tokenizer, so deltas compare. Absolute numbers matter less than change.
- CI reports the table per PR next to the bundle report (section 7.2.5). A growth over a set
  percentage fails unless the PR carries an explicit label.
- Progressive disclosure: `llms.txt` → per-entry doc → skill reference file. An agent reads only
  the files that its task needs.

### 12.4 Evals (D11)

- **Harness:** AILF. Config in `.ailf/`, tasks in `.ailf/tasks/*.yaml`, gold answers in
  `.ailf/canonical/`, and a committed results snapshot in `.ailf/results/latest/` (the UI v5
  layout).
- **Two task modes.**
  - Literacy: question and code tasks graded by rubric and `contains`/`not-contains`.
  - Agent Harness: a sandboxed agent changes one of the example apps (section 8). The graders are
    commands that already exist: `tsc`, the production build, the bundle harness (section 7), the
    security unit tests, and the Playwright specs for the feature. An eval passes only when the
    app works and stays within budget.
- **Metrics.** AILF's Floor (no docs), Ceiling (curated docs), Actual (agent finds docs), Doc Lift
  and Retrieval Gap. Add **Skill Lift**: the same tasks with and without the skill loaded. Also
  track tokens, cost, turns, and hallucinated API names (names absent from the `.d.ts`).
- **Tasks come from real failure modes**, one failure per task. Seed list:
  - Token reaches the browser, or a `/server` entry is imported in a client module.
  - `<VisualEditing>` rendered without `enabled`.
  - Preview cookie written without `Partitioned`, or overwritten by `headers.set`.
  - Perspective missing from a hand-written cache key.
  - `mode=no-stale` written instead of `cacheMode: 'noStale'`.
  - Hydrogen-era APIs (`createWithCache`, `context.sanity`, `loadQuery`) or `react-router-dom`.
  - Sync Tag Invalidate Function that never calls `done()`.
  - Media Library GDR passed straight to `@sanity/image-url`.
- **Models.** A matrix that includes a small model. UI v5 found that small models expose API
  problems that large models hide.
- **Method lessons from UI v5:** generate prompts with an agent across domains, so the SDK does
  not overfit one prompt; aggregate over prompts, because small-model runs are noisy; run a
  docs-only variant with the skill and tools off, because tools mask doc gaps; ask the agent for
  friction feedback at the end of each run.
- **Cadence and gate.** A fast subset runs on PRs that touch `src`, `docs` or `skills`
  (manual trigger or label, for cost). The full matrix runs before each release. A score drop
  beyond the AILF baseline threshold (±2) blocks the release.

### 12.5 Skills and the `doctor` CLI

- **One skill, shipped in the package:** `skills/react-router-sanity/SKILL.md` plus
  `references/*.md`.
- **`SKILL.md` structure (UI v5 pattern):**
  - A trigger-rich description with explicit "do not use for" cases (Studio schemas, GROQ
    authoring, Next.js).
  - The silent failures the skill prevents.
  - The load-bearing facts, including "the installed package beats the docs".
  - A workflow: read `node_modules/react-router-sanity/llms.txt`, run
    `npx react-router-sanity doctor`, implement, then verify with `tsc` and `doctor` again.
  - Rules grouped by area, each naming the failure it prevents.
  - A "wrong → right" table.
  - The version the skill was verified against.
- **References**, each read "when the task touches it": setup (vanilla), setup (Hydrogen),
  querying and caching, preview and Presentation, live content, media, security, rendering modes
  and RSC, migrating from `hydrogen-sanity`.
- **`doctor` CLI (D14):** non-interactive, with JSON output for agents. It checks the
  middleware registration, the React Router `v8_middleware` flag on 7.x, the preview route, the
  env vars, the cookie options, the Studio CORS origin, and `<VisualEditing enabled>`. `init`
  scaffolds the minimal setup with `--yes` for agents and CI.
- **Skill evals:** Skill Lift in AILF (section 12.4), plus a description-routing check that the
  skill triggers on React Router + Sanity prompts and not on Next.js or Studio prompts.

## 13. Milestones

Each milestone ends with green gates and a commit. Harness first, because the invariant must be
measured before code moves. From M1 on, every milestone also ships: TSDoc for its exports,
AILF tasks for its features, the skill reference for its area, and no AILF score regression.

| M   | Scope                                                                                                                                                                                                                                                                                                | Exit gate                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| M0  | Package skeleton with the full condition map, both example apps + RSC app, rendering-mode fixtures, Playwright matrix, bundle harness (7.1 + 7.2), condition matrix; AX harness: doc-coverage + STE lint, token report, `.ailf/` with seed tasks and a Floor baseline, skill skeleton, `doctor` stub | Harness runs against both apps; baseline recorded      |
| M1  | Middleware, context key, `fetch`, cache port + 3 adapters, tag collection, `Server-Timing`                                                                                                                                                                                                           | Unit + E2E production paths green; graph checks green  |
| M2  | Preview session, enable/exit/perspective/variant route, CHIPS, `<VisualEditing enabled>` (L1), CSP utility and strict-policy example (E6)                                                                                                                                                            | Security E2E (S1–S7, S10) green; zero CSP violations; no preview chunk in prod |
| M3  | `<SanityLive>`, `live/route`, Function template, CDN tag headers (if D6)                                                                                                                                                                                                                             | Live E2E green; invalidation auth tests green          |
| M4  | L2–L4: live drafts, client loaders, optimistic hooks                                                                                                                                                                                                                                                 | Presentation E2E green in both apps                    |
| M5  | Images, files, video, signing, aspects                                                                                                                                                                                                                                                               | Media E2E; client budget still met                     |
| M6  | `hydrogen-sanity` v8 on top; migration guide; docs                                                                                                                                                                                                                                                   | Shopify example runs on `hydrogen-sanity` v8 unchanged |

## Appendix A: sources

- `PREWORK-react-router-sanity.md`, `V7-PLAN.md` (this repo).
- `sanity-io/next-sanity` origin/main f691ea56 (v13.4.0): `src/live/**`, `src/draft-mode/**`,
  `src/visual-editing/**`.
- `sanity-io/visual-editing` origin/main: `@sanity/visual-editing` 6.2.1
  `src/react-router/**`, `@sanity/preview-url-secret` 4.1.5 `validatePreviewUrl.ts`.
- `sanity-io/comlink`: `presentation-comlink/src/types.ts`.
- `sanity-io/sanity-sveltekit` (`@sanity/sveltekit` 3.0.0), `sanity-io/sanity-astro` (3.6.2),
  `nuxt-modules/sanity` (2.5.0).
- `sanity-io/lcapi-examples` (`studio/functions/cache-invalidate`, Astro `lastLiveEventId`).
- `sanity-io/client` main: `src/data/live.ts`, `src/mediaLibrary/MediaLibraryVideoClient.ts`.
- `sanity-io/image-url` origin/main (v2.1.1), `@sanity/asset-utils` 2.3.0.
- `remix-run/react-router` origin/main (8.5.1): CHANGELOG, `docs/how-to/{middleware,presets,security}.md`.
- `Shopify/hydrogen` origin/main (2026.10.3): `templates/react-router/{server.ts,app/root.tsx}`,
  `packages/hydrogen/src/core/cache/run-with-cache.ts`, `skills/migrate-to-hydrogen-2026-10`.
- Sanity docs: Live Content API, sync tags, Sync Tag Function quickstart, Media Library
  (working with video, asset visibility, link media assets, aspects), visual editing with React Router.
- Sanity UI v5 AX: `sanity-io/ui` branch `v5-alpha` (`packages/ui/{docs,skills/sanity-ui-5,llms.txt,bin}`,
  `.ailf/`), `sanity.io/engineering/design-system-evals`, `sanity-labs/design-system-agent-tester`,
  `@sanity/ailf` (`sanity-labs/ai-literacy-framework`), Slack #ai-at-sanity and #design-system
  project updates (2026-08 to 2026-11).
