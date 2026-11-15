# Decisions: `react-router-sanity` first draft

Status: first draft · 2026-11-15 · Source: `SPEC-react-router-sanity.md` (repo root).

This file records what the first draft decided, and where it departs from the spec. Each entry
gives the evidence. Veto any entry; each one is small to reverse.

## Spec decisions taken as recommended

The draft takes the spec recommendation for every open decision in section 11. A later review can
reverse each one.

| #   | Decision                                                                          | Where in the draft                                       |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| D1  | New package in this monorepo                                                      | `packages/react-router-sanity`                           |
| D2  | Peer `react-router ^7.9.0 \|\| ^8.0.0`, Node `>=22.12`                            | `package.json`                                           |
| D3  | Middleware-first: one middleware plus a typed context key                        | `src/server/middleware.ts`, `src/context.ts`             |
| D5  | Live drafts: opt-in `preview.browserToken` (a), Presentation refresh by default (c) | `src/server/config.ts`, `src/live/client.tsx`            |
| D6  | CDN tag headers opt-in                                                            | `cdnTags` option, `src/server/headers.ts`                |
| D8  | Name `react-router-sanity` (no technical difference; easy to rename before publish) | `package.json`                                           |
| D9  | RSC-ready: conditions and directives; no RSC release gate                         | `exports` map, `scripts/check-conditions.mjs`            |
| D10 | SPA mode: query only                                                              | Not built yet (see "Deferred")                           |

## Departures from the spec

### 1. Routes return `syncTags`; the root loader does not

**Spec (5.1, 5.4):** the root loader exposes the collected sync tags of the request to `<SanityLive>`.

**Problem:** React Router runs the root loader in parallel with the child loaders. When the root
loader returns, the child queries have not run, so the tag set is incomplete.

**Draft:** each loader returns `syncTags` from its own `fetch` result. `<SanityLive>` reads the
top-level `syncTags` of every match through `useMatches()`. When no route returns tags, every
event revalidates the page (correct, but more requests). See `src/live/tags.ts`.

### 2. `lastLiveEventId` travels in a 10-second cookie

**Spec (5.4):** a search param on the data request or a header; not a cookie, "because a cookie
makes every response private".

**Problem:** `useRevalidator().revalidate()` cannot add a search param or a header to the data
request. A navigation with a search param changes the visible URL.

**Draft:** `<SanityLive>` sets `__sanity_live_event` with `Max-Age=10` before the revalidation and
deletes it after. Only the revalidation request carries it, so other responses stay cacheable.
With `live.waitFor: 'function'`, the cookie is not used. See `src/live/client.tsx`.

### 3. `waitUntil` is a middleware option, not a `webCache` option

**Spec (5.1 example):** `webCache({cache, waitUntil})`.

**Draft:** `createSanityMiddleware(() => ({waitUntil: ctx.waitUntil, ...}))`. The
stale-while-revalidate runner needs `waitUntil` for every adapter (KV too), not only for the Web
Cache API.

### 4. The root entry does not re-export `stegaClean`

**Spec (4.1):** the root entry has `stegaClean` and "no runtime dependencies beyond `groq`".

**Evidence:** `@sanity/client/stega` re-exports the whole client. With the re-export, the module
evaluation probe showed the root entry evaluating `@sanity/client`, `rxjs`, `get-it` and `undici`.
Without it: `groq` and `react-router` only.

**Draft:** import `stegaClean` from `@sanity/client/stega`. `scripts/check-eval.mjs` now fails if a
browser-eager entry evaluates `@sanity/client`.

### 5. The 3 KB client budget is below the upstream floor

**Spec (7.2.1):** SDK share ≤ 3 KB gzip on a route with `fetch` + `<SanityImage>`.

**Measured (example app, home route, gzip, summed per chunk):**

| Code                        | Bytes |
| --------------------------- | ----- |
| `@sanity/image-url`         | 4,018 |
| `@sanity/asset-utils`       | 3,065 |
| `react-router-sanity` total | 2,107 |
| of which `<SanityImage>`    | 1,201 |
| of which root gates         | 458   |
| of which `usePreview`       | 448   |

`@sanity/image-url` alone is over 3 KB. **Draft budget** (enforced in
`examples/react-router/e2e/sanity.spec.ts`): first-party ≤ 2,500 B, all `@sanity/*` ≤ 9,000 B.
**Options:** keep upstream and accept ~8.5 KB; or send a tree-shaking PR to `@sanity/asset-utils`
(the draft calls only `getImageDimensions` and `getProject`, which cost 3 KB).

### 6. Strict perspective validation

**Evidence:** `validateApiPerspective` in `@sanity/client` 8.16.0 only rejects `raw` inside an
array. It accepts any other value, objects included. A unit test caught this: the preview action
accepted `"not a perspective!"`.

**Draft:** `isPerspective` (`src/server/session.ts`) accepts a name or a non-empty array of names
matching `^[A-Za-z0-9][\w.-]{0,127}$`, then calls the upstream check. Upstream gap: add to spec
section 9.

### 7. `webCache` purges one data center on Cloudflare

The Cloudflare Cache API is local to a data center. A tag invalidation from the live route purges
only the data center that receives the call. The draft documents this on `webCache` and points
to `kvCache` for global purges. The spec lists `webCache` as the Cloudflare adapter with no caveat.

### 8. `<SanityImage>` takes `config`, not root data

The image entry must be safe under `react-server` (spec 4.3): no hooks. So the component cannot
read the project from root loader data. It takes `config={{projectId, dataset}}`, or reads both
from an expanded `asset->url`.

### 9. The harness cannot evaluate `react-server` entries in plain Node

React Router's own `react-server` build imports a `'use client'` module, which only an RSC bundler
can replace. Under `--conditions=react-server`, the condition matrix checks resolution and the
no-hooks rule. Real RSC evaluation belongs to the RSC example app (not built yet).

### 10. The long default TTL needs a store with global invalidation

**Spec (5.1):** a long TTL "when an invalidation path exists".

**Problem (found in review):** `memoryCache` is per process and `webCache` is per data center. A
purge from the live route reaches one instance. With two Node instances, the second one served old
content for up to 1 hour.

**Draft:** the cache port has an `invalidation: 'global' | 'local'` flag. `kvCache` is `'global'`;
`memoryCache` and `webCache` are `'local'`. The SDK uses the long TTL only for a `'global'` store
with `live.secret` set.

### 11. Content Security Policy is a requirement (E6), built on the `feature/add-csp` pass

**Request (2026-11-15):** Sanity CSP is a requirement and a utility export.

**Prior art:** `origin/feature/add-csp` (`fdf22e2`, 2025-09-02) added `createSanityCSPHelpers(client)`
to `hydrogen-sanity`. Commit `7e82436` (2025-11-19) added the Dashboard to `frame-ancestors` in
the example. Issue #121: an `undefined` directive crashed Hydrogen's serializer.

**Kept from the pass:** hosts come from `client.config()` (`apiHost`, `useProjectHostname`), so a
staging or custom host gives matching sources. The Dashboard origin (`https://www.sanity.io`) is
in `frame-ancestors`, because `frame-ancestors` checks every ancestor.

**Fixed from the pass:** `assetCdn` was `https://cdn.sanity.io/*/{projectId}/{dataset}`. CSP allows
no `*` in a path, so browsers drop that source. The draft uses
`https://cdn.sanity.io/images/{projectId}/{dataset}/` and `.../files/...`. The Dashboard origin is
in preview only; `7e82436` sent it on every response.

**Design:**

- `getSanityCspDirectives(context)` reads everything from the request. `createSanityCspDirectives(options)`
  is the pure builder. Both return camelCase directives with no nonce, which Hydrogen 2026.10
  `createContentSecurityPolicy({directives})` merges into its defaults (it rejects manual nonces).
- `serializeCsp` and `createNonce` cover React Router without Hydrogen. `serializeCsp` skips
  empty directives (issue #121) and lets added sources replace `'none'`, as Hydrogen does.
- **Nonce for the overlays, with no app code.** styled-components 6.4 reads its nonce from
  `<meta property="csp-nonce">`. `<VisualEditing>` copies the nonce of a React Router script tag
  into that meta tag (in the `nonce` property, not an attribute). E2E proves the overlays inject
  styles and every style carries the nonce, under `style-src 'self' 'nonce-…'`.

**Bug found by the CSP E2E:** browser code ignored a custom `apiHost`. `<SanityLive>` always
connected to `*.api.sanity.io`, and `urlFor` rewrote staging asset URLs to `cdn.sanity.io`. Root
data now carries `apiHost` and `useProjectHostname: false`, `<SanityLive>` uses them, and
`<SanityImage>` keeps the origin of the asset URL or takes `config.baseUrl`.

**Known limit:** the LQIP placeholder of `<SanityImage>` is an inline `style` attribute. A policy
without `'unsafe-inline'` for style attributes blocks it; the image still loads.

**Upstream gaps:** `getProject` in `@sanity/asset-utils` drops the CDN host. `@sanity/visual-editing`
has no `nonce` option; the meta tag is a workaround that depends on styled-components internals.

## Review outcome (fresh-context adversarial review, 2026-11-15)

The reviewer confirmed claims on request isolation, token handling, preview cache headers, the
cache key, `Set-Cookie` handling and the React Router 8 integration. It found no token or
preview-response leak. Fixed, each with a regression test:

| Finding                                                                    | Fix                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm check` passed on a stale `dist`                                       | `check` builds first                                         |
| A malformed `__sanity_live_event` cookie threw on every request            | Decode in `try`; accept only `^[A-Za-z0-9._:=+/-]{1,128}$`    |
| `memoryCache` returned shared objects; a loader could mutate the cache     | `structuredClone` on `get` and `set`                         |
| Long default TTL with per-process and per-data-center stores               | Departure 10                                                 |
| A stale hit without `waitUntil` waited for the refresh                     | Background work runs detached                                |
| An `onError` that throws failed the request                                | `onError` runs in `try`                                      |
| `<SanityLive>` polled forever after a stream error                         | Reconnect with backoff (1 s to 60 s); poll only in a visible tab |
| `<SanityLive includeDrafts>` turned live off for public visitors           | `includeDrafts` applies only in preview                      |
| The CDN tag header replaced tags that the route wrote                      | `append`                                                     |
| The invalidation body had no size limit                                    | 413 over 64 KB                                               |
| `variant` had no validation                                                | `^[A-Za-z0-9][\w.:-]{0,127}$` on enable and on `PUT`         |
| The hooks rule did not walk shared chunks                                  | Walks the static graph; positive control added               |

Accepted, documented, not changed:

- **Replay inside 5 minutes.** The live route accepts a captured call again inside the window. A
  purge is idempotent. The TSDoc now states this.
- **Any visitor can send a well-formed `__sanity_live_event` cookie** to skip the app cache for
  that request. The API CDN still serves it (`cacheMode: 'noStale'`). This is the cost of
  departure 2. With `live.waitFor: 'function'`, the server can ignore the cookie (not built).
- **CDN tags miss deferred queries.** Tags of a streamed `fetch` arrive after the headers.
- **`Origin` check behind a proxy.** If the adapter rewrites `request.url` to `http://` or another
  host, every `PUT` and `POST` gets 403. Verify per deployment target.
- **`Server-Timing` is on by default** and shows cache hit counts publicly. Low sensitivity.
- **No single-flight** for concurrent loads of one key.
- **The STE first-word check** accepts any capitalized word that ends in "s" ("Props").
- **Peer ranges `react-router ^7.9` and `@sanity/client ^7.28` are untested.** Only RR 8.5.1 and
  client 8.16.0 ran.

## Upstream findings

- `@sanity/preview-url-secret` already forwards the Vercel protection bypass (P9) and accepts
  shared-access secrets (P6). The SDK needs no code for either.
- `@sanity/visual-editing/react-router` statically imports `@sanity/visual-editing-csm`. The SDK
  loads it through `import()` behind `enabled`, so production pays 0 bytes.
- es-module-lexer 3 changed its import record to `{type, specifier}`. The first version of the
  graph check passed on nothing. The check now has positive controls that must find known edges.

## Deferred (not in this draft)

| Item                                           | Spec       | Reason                                                                  |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `examples/hydrogen`, `examples/react-router-rsc` | 8          | Next increment. The vanilla example and E2E come first.                 |
| Rendering-mode fixtures (streaming, prerender, SPA) | 4.3, 8 | Next increment.                                                         |
| Video, Media Library signing, aspects          | 5.6, D7    | G4 is optional. Needs upstream GDR parsing first (section 9).           |
| L3 `useQuery` facade                           | D4         | A static import puts the loader code in production. Needs a lazy design. |
| Sync Tag Invalidate Function template          | 5.4        | `notifyApp` exists in `live/function`; the blueprint file does not.     |
| AILF evals, token report, `doctor` CLI         | 12.3–12.5  | AX harness increment. The docs gate (12.2) exists.                      |
| Server cold-start probe on the example         | 7.2.4      | The library-level evaluation probe covers the rule for now.             |
