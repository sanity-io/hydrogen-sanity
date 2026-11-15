---
name: react-router-sanity
description: Use when you add Sanity content, preview, Presentation (visual editing), live content or Sanity images to a React Router framework-mode app (React Router 7.9+ with v8_middleware, or React Router 8), with or without Shopify Hydrogen. Triggers on "react-router-sanity", "Sanity + React Router", "visual editing in React Router", "Presentation tool React Router", "sanity middleware", "migrate from hydrogen-sanity". Do not use for Sanity Studio schemas, GROQ authoring on its own, Next.js (use next-sanity), or Remix v2.
---

# react-router-sanity

Verified against `react-router-sanity` 0.0.0 (first draft), `react-router` 8.5.1, `@sanity/client` 8.16.0.

## The installed package beats the docs

Read `node_modules/react-router-sanity/llms.txt` first. It lists every entry and guide. The
installed `.d.ts` files and `docs/` match the installed version. Web docs and your training data
can be older.

## Silent failures this skill prevents

- A Sanity token reaches the browser.
- Every visitor downloads 200 KB of overlay code because `<VisualEditing>` has no `enabled` gate.
- A preview cookie dies in the Presentation iframe (no `Partitioned`), or another middleware
  overwrites it with `headers.set`.
- A preview response lands in a shared CDN cache.
- Cached content from one perspective is served to another (perspective missing from a cache key).
- `<SanityLive>` never revalidates a route because the loader drops `syncTags`.

## Workflow

1. Read `node_modules/react-router-sanity/llms.txt`.
2. Open the reference for the task (table below). Read only what the task needs.
3. Implement.
4. Verify: `react-router typegen && tsc`, then the production build. A server-only import in
   browser code fails the build with `RRS001`.

| Task touches                                  | Read                               |
| --------------------------------------------- | ---------------------------------- |
| First setup, env vars, root route             | `references/setup.md`              |
| Queries, TypeGen, app cache, invalidation      | `references/querying-and-caching.md` |
| Preview, Presentation, overlays, perspectives  | `references/preview.md`            |
| Live updates, Sync Tag Invalidate Function     | `references/live.md`               |
| Images                                         | `references/images.md`             |
| Tokens, cookies, CSRF                          | `references/security.md`           |
| Content Security Policy, nonces, framing       | `references/csp.md`                |
| Moving from `hydrogen-sanity`                  | `references/migrating-from-hydrogen-sanity.md` |
| An error with a code `RRS0xx`                  | `docs/errors/RRS0xx.md` in the package |

## Rules

**Setup**

- MUST register `createSanityMiddleware` once, in `export const middleware` of `app/root.tsx`.
  Prevents: `RRS010` in every loader.
- MUST return `{sanity: context.get(sanityContext).getRootData()}` from the root loader.
  Prevents: `usePreview()` always `false`; `<SanityLive>` never connects.
- On React Router 7, MUST set `future.v8_middleware: true`. Prevents: middleware never runs.

**Querying**

- MUST use `context.get(sanityContext).fetch({query, params})`. There is no `loadQuery` and no
  `query()`. Prevents: Hydrogen-era code that does not compile.
- MUST return `syncTags` from each loader that fetches. Prevents: `<SanityLive>` cannot match
  events, so it revalidates on every change.
- SHOULD wrap queries in `defineQuery` and run Sanity TypeGen. Then `fetch` infers the result type.
  Without TypeGen, pass a type: `fetch<Page>({query})`.
- MUST-NOT build your own cache key. The SDK key includes perspective, variant, params, dataset
  and API version.

**Preview and Presentation**

- MUST render `<VisualEditing enabled={preview.enabled} />`. Never render it unconditionally.
- MUST mount the preview route: `export {loader, action} from 'react-router-sanity/preview/route'`
  at `app/routes/api.preview.ts` (path `/api/preview`, or set `preview.route`).
- MUST-NOT pass a token to `createClient`. Pass the Viewer token as `serverToken`.
- MUST append cookies in your own middleware or `server.ts` (`headers.append('Set-Cookie', …)`).
  Never `headers.set('Set-Cookie', …)`.

**Content Security Policy**

- MUST build the Sanity part of the policy with `getSanityCspDirectives(context)`. Prevents:
  Presentation "refused to frame", blocked images, blocked live events, wrong hosts on staging.
- MUST-NOT put a Studio origin in `frame-ancestors` for every request. The function adds it in
  preview only.

**Imports**

- MUST import server-only entries (`/server`, `/cache`, `/preview/route`, `/live/route`, `/csp`)
  only from loaders, actions, middleware or `*.server.ts` files.
- SHOULD import `stegaClean` from `@sanity/client/stega`, not from this package.

## Wrong → right

| Wrong                                                       | Right                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `context.sanity.loadQuery(QUERY)`                           | `context.get(sanityContext).fetch({query: QUERY})`                    |
| `createWithCache`, `CacheLong` from `@shopify/hydrogen`     | `cache: {store: webCache({...})}` in the middleware config            |
| `import {...} from 'react-router-dom'`                      | `import {...} from 'react-router'`                                    |
| `createClient({token: env.SANITY_TOKEN})`                   | `createClient({...})` plus `serverToken: env.SANITY_VIEWER_TOKEN`     |
| `{preview ? <VisualEditing /> : null}`                      | `<VisualEditing enabled={preview.enabled} />`                         |
| `mode=no-stale` or `useCdn: false` for freshness            | Nothing: production `fetch` already sends `cacheMode: 'noStale'`      |
| `return {page: data}`                                       | `return {page: data, syncTags}`                                       |
| `urlFor(image)` with a Media Library `media-library:` ref   | Query the linked dataset asset (`asset->`), not the GDR               |
| A Sync Tag Invalidate Function without `done()`             | `await notifyApp({...}); await context.done(syncTags)`                |
| `frameAncestors: [studioUrl]` on every response             | `getSanityCspDirectives(context)` (preview only, plus the Dashboard)  |
| `https://cdn.sanity.io/*/p1/production` as a CSP source     | `https://cdn.sanity.io/images/p1/production/` (CSP has no path `*`)   |
