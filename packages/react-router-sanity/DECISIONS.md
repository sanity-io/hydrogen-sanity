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
