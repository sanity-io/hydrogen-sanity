# TODO: `setServerClient` singleton can hold stale config across requests

## Problem

`setServerClient()` in `context.ts` is guarded by `didInitializeLoader` (line ~268), a
module-level boolean. It runs once per worker isolate lifetime. On subsequent requests the
singleton retains whatever client config (token, perspective, useCdn) it was first
initialized with.

If a **non-preview** request triggers `loadQuery` first, the singleton is initialized with
a client that has no preview token and `useCdn: true`. Later preview requests pass
`perspective` explicitly (fixed in this PR), but `@sanity/react-loader`'s `loadQuery` may
still use the singleton's underlying client for the actual GROQ fetch — meaning it could
hit the CDN without a token and miss draft/release content.

## Desired fix

On every `loadQuery` call, ensure the singleton reflects the current request's client config.
Options:

1. **Call `setServerClient(client)` on every request** instead of gating behind
   `didInitializeLoader`. This is the simplest fix but may have performance implications
   worth measuring.
2. **Pass the full client via `loadQuery` options** if `@sanity/react-loader` supports it
   (check upstream API).
3. **Separate the singleton per preview/non-preview path** so the first non-preview call
   doesn't poison preview requests.

## Where to look

- `packages/hydrogen-sanity/src/context.ts` — the `didInitializeLoader` guard (~line 268)
- `@sanity/react-loader` — `setServerClient` and `loadQuery` internals
