# Prework: toward `react-router-sanity`

Scope note. v7 ships the dependency and visual-editing work only — React 19.2.3 floor,
`@sanity/visual-editing` v5, the stega props, peer corrections, and the oxlint/oxfmt migration.
See `V7-PLAN.md`. **Everything in this document is prework for a possible new package, not v7
scope.** Nothing here should delay unblocking the stega props.

Hydrogen's `preview` branch confirms the destination: it removes the React Router layer from
`@shopify/hydrogen` entirely (verified against the published `preview` dist-tag). A future
package must still support the latest _classic_ Hydrogen while getting there.

## The preview/non-preview split invariant is currently broken on the server

**The invariant:** non-preview requests must carry zero extra bundle or cruft; the preview data
path must be lazily loaded only in preview. `context.query` exists to make handling both a
one-call affair. This is design intent, not incidental.

`src/context.ts` implements it correctly — the preview data path is loaded on demand at `:267`,
`:279`, and `:307` via `await import('@sanity/react-loader')`, and the only static reference in
that file is `import type {QueryResponseInitial}`, which erases at build.

**But `src/index.ts` defeats it.** Lines 10-11 re-export _values_ from the same module:

```ts
export type * from '@sanity/react-loader' // fine, erases
export {useEncodeDataAttribute} from '@sanity/react-loader' // value re-export
```

which compiles to static imports in the root entry (`dist/index.js:10-11`):

```js
import {useQuery as useQuery$1} from '@sanity/react-loader'
export {useEncodeDataAttribute} from '@sanity/react-loader'
```

So importing _anything_ from `hydrogen-sanity` pulls `@sanity/react-loader` into the graph
eagerly, and the three `await import()` calls in the same built file (`:83`, `:92`, `:108`)
buy nothing. Confirmed downstream: the example's Oxygen worker bundle (645 KB raw / 193 KB gz)
contains `@sanity/react-loader`, and with it `@sanity/core-loader`, `@sanity/comlink`,
`@sanity/presentation-comlink`, `@sanity/visual-editing-csm`, and `@sanity/preview-url-secret`.
Installed sizes: react-loader 516 K, core-loader 728 K, comlink 408 K.

**Fix shape (breaking, and a strong reason for v7):** move the loader-coupled surface
(`useEncodeDataAttribute`, `useQuery`, the `@sanity/react-loader` type re-export) off the root
entry onto a subpath the non-preview path never touches. Then add a CI assertion that the root
entry's built output contains no static `@sanity/react-loader` import — otherwise this silently
regresses, exactly as it did here. Note the client side is already clean: eager client cost is
808 B raw / 620 B gz. This is a **server/worker** bundle problem.

## A live bug in the documented happy path

`src/context.ts:358` is:

```ts
return await (previewEnabled ? this.loadQuery : this.fetch)(query, params, queryOptions)
```

The `this` makes `query` receiver-dependent, so the README's recommended usage breaks when
destructured. Reproduced in a scratch test against the exact shape:

```
const {query} = context.sanity
await query(q)
// TypeError: Cannot read properties of undefined (reading 'fetch')
```

`context.query` has **zero** test coverage. The fix is to close over `loadQuery`/`fetch` rather
than reach through `this`, which also preserves the auto-switch that is the method's whole
purpose. Non-breaking, and it should land regardless of the architecture verdict.

## Hydrogen's `preview` branch changes the destination

Verified against the published `preview` dist-tag (`0.0.0-preview-8a708a8-20260708155454`), not
just the announcement. Shopify's developer preview (2026-06-17, rebuilt with the Next.js team at
Vercel) does not _separate_ Shopify concerns from React Router — it **removes the React Router
application layer from `@shopify/hydrogen` entirely.**

|                          | shipped `2026.4.4`                               | `preview`              |
| ------------------------ | ------------------------------------------------ | ---------------------- |
| `react-router` peer      | `~7.16.0`                                        | **absent**             |
| `@react-router/dev` peer | `~7.16.0`                                        | **absent**             |
| `vite` peer              | `^5.1.0 \|\| ^6.2.1 \|\| ^7 \|\| ^8`             | **absent**             |
| `react` peer             | `^18.3.1 \|\| ~19.0.3 \|\| ~19.1.4 \|\| ^19.2.3` | `^18.0.0 \|\| ^19.0.0` |
| runtime deps             | 9, incl. `hydrogen-react`, `worktop`             | **`gql.tada` only**    |

Grepped the preview `dist/`: **zero** occurrences of `react-router`, `AppLoadContext`,
`HydrogenSession`, `Oxygen`, `createWithCache`, `CacheLong`, or `NonceProvider`. The `preview`
branch ships exactly one package; `hydrogen-react`, `hydrogen-codegen`, `cli-hydrogen`,
`mini-oxygen`, and `remix-oxygen` are gone from it. React Router is demoted from _the_ framework
to one of several example ports.

**This inverts the v8 conclusion above.** "RR v8 is not reachable" was correct _conditional on
the `@shopify/hydrogen` peer_. The preview deletes Hydrogen's React Router peer, so dropping our
Hydrogen peer removes the blocker. And RR 8 is already at 8.3.0 with both
`react-router-examples` and `react-router-templates` fully migrated to it — **a
`react-router-sanity` launching v7-only would be born behind.** Keep the v7 peer for v7; plan the
SDK on `^8`.

### What happens to our two seams

- **Cache — survives, renamed, less coupled.** `createWithCache` → `createRunWithCache`,
  `CacheLong()` → `Cache.long()`. `request` is gone (it fed the subrequest profiler),
  `waitUntil` becomes optional, and the cache type widens from Oxygen's Web Cache to
  `WebCacheLike | KeyValueCacheLike`. Roughly 30 lines in `context.ts`, and a net decoupling win.
- **Convention — disappears.** `context.sanity` / `context.session` off `AppLoadContext` has no
  successor; the preview template uses React Router's own `createContext()` +
  `RouterContextProvider`. `HydrogenSession` becomes `ShopifyRouteSessionManager`
  (`getSessionItem`/`setSessionItem`/`removeSessionItem`/`commit?`), which is satisfiable with no
  Shopify _or_ React Router dependency. This is exactly the port the middleware spike was
  heading toward — the two pieces of work converge.

### Do not build against the preview yet

No GA date. Shopify commits that "Current Hydrogen remains fully supported" and `2026.4.x` is
untouched. Churn evidence: `createStorefrontRequestContext` → `createShopifyRequestContext` with
no compat alias, the preview branch's own template still importing the old name, a
`patch-hydrogen-exports.mjs` postinstall hack because the published preview omits
`"./package.json"` from its exports map, and Oxygen deploy via the CLI not wired up.
[Discussion #3876](https://github.com/Shopify/hydrogen/discussions/3876) asks for a roadmap and
has no replies.

**The nearer-term risk is not the preview.** Draft PR
[Shopify/hydrogen#3813](https://github.com/Shopify/hydrogen/pull/3813) (RR 8 support on the
classic line) migrates to `context.get(hydrogenContext.*)`, which breaks `context.session` reads,
and drops React 18 and Vite 5/6. It is stale (`draft`, `dirty`, untouched since 2026-06-19) but
it is what would bite our `~2026.1.0 || ~2026.4.0` peer first.

**Also concretely broken on preview today:** `createContentSecurityPolicy`, `NonceProvider`, and
`useNonce` are deleted, and `examples/storefront/app/entry.server.tsx` and `entry.client.tsx`
import them.

## React Router's native tooling conventions

Relevant because the SDK and its example should read as React Router-native, not Shopify-derived.

**Examples and templates have left the main repo.** `remix-run/react-router/examples/` is now a
README pointing at `remix-run/react-router-examples`, and `templates/` no longer exists —
`create-react-router` hardcodes `remix-run/react-router-templates/tree/main/default`. The
templates README says new templates will not be accepted; community templates get a README link.
So the user-facing starter belongs in its own repo, e.g. `sanity-template-react-router`.

**The official templates carry zero lint and zero format config** — no ESLint, no Prettier, no
oxlint, not even a devDependency. `default/package.json` has no `name`, no `version`, and exactly
four scripts:

```json
"build": "react-router build",
"dev": "react-router dev",
"start": "react-router-serve ./build/server/index.js",
"typecheck": "react-router typegen && tsc"
```

The only quality gate is `react-router typegen && tsc`. CI runs Playwright smoke tests only.

**The examples repo is root-only tooling:** one `.oxlintrc.json` (`categories: {correctness:
"warn"}`, plugins `["typescript", "oxc", "react"]`) plus Prettier with **no config file** — pure
defaults. npm rather than pnpm, per-example lockfiles, and 22 byte-identical `tsconfig.json`
files with no `extends`. All 22 examples have **no lint or format devDeps of their own**.

**The `react-router` monorepo itself** uses ESLint 10 (`eslint.config.ts`) + Prettier with
`export default {}`, `tsdown` for builds orchestrated by `wireit`, no turbo/nx, and a pnpm
catalog for `react`/`typescript`/`vite`. In-repo consumers of the library live in `playground/*`
on `workspace:*` — user-facing examples are a different repo entirely.

**No oxfmt anywhere in the React Router ecosystem.** Nor in Sanity's own
`sanity-template-react-router-clean`, which uses root `@sanity/prettier-config` plus per-workspace
ESLint. Our workspace-scoped split already accommodates this: oxfmt/oxlint for the published
package (Sanity house), examples free to match React Router conventions.

### Conventions to adopt

- **Shed the example's Shopify lint inheritance.** `examples/storefront` carries ~25 ESLint
  devDeps plus `@shopify/prettier-config`, `eslint-plugin-jest`, and `eslint-config-prettier`.
  React Router's official starting point has none. This is the single biggest piece of inherited
  Shopify tooling.
- **Adopt the 4-script block verbatim**, with Sanity typegen as `predev`/`prebuild` hooks — the
  pattern already proven in `sanity-template-react-router-clean`.
- **Copy `default/tsconfig.json`.** The `rootDirs: [".", "./.react-router/types"]` plus
  `.react-router/types/**/*` in `include` is load-bearing for typegen, and `resolve.tsconfigPaths:
true` in `vite.config.ts` now replaces `vite-tsconfig-paths`.
- **Package shape:** add `"module-sync"` to the `exports` conditions (universal on
  `@react-router/*`), drop `typesVersions` in favour of `types` inside each `exports` entry, keep
  `react-router` as a peer, and add `typescript` as an _optional_ peer.
- **Copy `minimumReleaseAge: 10800`** into `pnpm-workspace.yaml` — cheap supply-chain win.

### Closest prior art

`sanity-io/sanity-template-react-router-clean` (private, npm workspaces, `studio` + `frontend`)
wires Sanity into React Router 7 with **no first-party glue package at all** — a plain
`createClient`, a 5-line `setServerClient` + `loadQuery` re-export, preview state in React
Router's own `createCookieSessionStorage`, and `<VisualEditing />` from
`@sanity/visual-editing/react-router`. That is roughly hydrogen-sanity's feature set hand-rolled
in about seven files, and it is precisely the surface a `react-router-sanity` package should
absorb.

### React Router v8 is not reachable in v7 — drop it from scope

React Router v8 shipped 2026-06-17 and is at 8.3.0. We cannot adopt it, on three
independent counts:

| Blocker                                                   | Evidence                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `@shopify/hydrogen@2026.4.4` pins `react-router: ~7.16.0` | No consumer can install RR 8 alongside Hydrogen at all          |
| RR 8 requires `node >=22.22.0`                            | Our engines are `>=20.19 <22 \|\| >=22.12` — would drop Node 20 |
| `react-router-dom` is deleted in v8, frozen at 7.18.1     | `examples/storefront` depends on `react-router-dom@7.14.0`      |

Widening the peer range to `^7.6.0 || ^8.0.0` would be dead metadata: permissive, but
unsatisfiable in practice. **Hydrogen's pin is the strongest technical argument yet for
issue #145** — RR v8 becomes reachable only once Hydrogen leaves the dependency graph.
Leave the `react-router` peer at `^7.6.0` for v7.

### Architecture for React Router — findings

Headed for `sanity-react-router` as Hydrogen diverges (issue #145; note the issue has zero
comments, so there is no recorded design debate to inherit).

**Do not build on RSC.** Still `unstable_` at 8.3.0, no `@react-router/rsc` package exists,
and it has already broken adopters twice (7.14.0 renamed the server component exports; 8.3.0
changed custom entry contracts). Docs explicitly warn of breaking changes in minors/patches.

**Do build on route context + middleware.** `createContext()` / `RouterContextProvider` /
`middleware` all stabilized in **7.9.0** and are mandatory in v8 — so this is reachable
today, within our `^7.6.0` peer, and is the forward-compatible direction. It gives typed
per-request DI that would replace the hand-threaded `SanityContext` on `AppLoadContext`, and
`context` is `Readonly` inside handlers, which is the "flexibility with guardrails" shape.
`clientMiddleware` is the real lazy-loading primitive: it is fetched via `await import()` in
its own chunk only when a route declares it. Caveat: no Sanity or React Router example does
preview-session-in-middleware, so ergonomics and testability against the existing 122-test
suite are unproven — **spike it, don't commit to it.**

The 7.15.0 stabilization wave (`unstable_url`/`unstable_pattern` → `url`/`pattern`, which is
what #192 is absorbing, plus ~12 others) was the last big rename batch. Remaining `unstable_`
churn is concentrated in RSC. Churn risk on the stable surface is now low.

### The bundle-cost goal is already met — the guardrail is what's missing

Measured, not assumed. Eager `hydrogen-sanity` cost in the example's client build is
**808 B raw / 620 B gz** (`utils` + `provider`), with **zero** eager bytes of
`@sanity/visual-editing`. The heavy payload — ~879 KB raw / ~286 KB gz, dominated by
`renderVisualEditing` at 188 KB gz — sits entirely behind `import()`. The four
`lazy(() => import('./X.client'))` wrappers work, and the Oxygen worker bundle contains zero
`@sanity/visual-editing` sources.

The gap is that the gate lives in **consumer** code by convention. `examples/storefront/app/root.tsx:166`
does `{previewMode ? <VisualEditing … /> : null}`, and that ternary is the only thing keeping
the 188 KB chunk away from production visitors. `@sanity/astro` and `@sanity/sveltekit` both
put an `enabled` prop in the library instead. A consumer who forgets the ternary ships the
chunk to everyone with no warning and no CI signal. Fixing this is a guardrail change, not a
bundle-cost change — worth doing, but do not oversell it as a size win.

Related fragility: the 808 B figure depends entirely on tree-shaking `@shopify/hydrogen` and
`@sanity/react-loader` out of the root entry, enabled by `"sideEffects": false`. No
export-condition or entry-point barrier enforces it and **nothing in CI would catch a
regression** — there is no `size-limit`/`bundlewatch`/`publint`/`attw` step. A size gate in CI
is the durable fix.

### Correctness bug: the provider is process-global mutable state

`src/provider.tsx:47` writes per-request state to
`globalThis[Symbol.for('Sanity Provider')]` **during render**, and `:34` reads it back.
In an Oxygen isolate serving concurrent requests, request A and request B share that binding,
so a page can serialize the _other_ request's `previewEnabled` / `perspective` into its HTML.
`Object.freeze` doesn't help — the binding is reassigned per request, not mutated. It is also
a render-purity violation.

No credentials leak (the token never enters `SanityProviderValue`), so this is a behavioral
correctness bug rather than a security one. But it is the **strongest argument for the
middleware rearchitecture**: React Router's `createContext()` / `RouterContextProvider` is
per-request by construction and would eliminate the shared-mutable-global class of bug
outright, rather than papering over it.

Two smaller issues in the same file: `assertSanityProviderValue` (`:18-26`) only rejects
`undefined`, so `null` passes and fails later at property access; and `JSON.stringify` into
`dangerouslySetInnerHTML` (`:64`) is not `<`-escaped.

### Extraction to `sanity-react-router` is far more tractable than expected

The Hydrogen coupling is **two seams**, not a pervasive entanglement:

1. **Runtime cache seam** — `createWithCache` (`src/context.ts:184`) and `CacheLong()`
   (`src/constants.ts:7`). Needs a `withCache`-shaped interface injected rather than imported.
2. **Convention seam** — `preview/route.ts:9-12` reads `context.sanity` / `context.session`
   off `AppLoadContext`, plus `HydrogenSession` duck-typing in `utils.ts:132-145`.

Everything else — all of `src/visual-editing/**`, `provider.tsx`, `image.ts`, `Query*.tsx`,
`preview/session.ts`, `preview/hooks.ts` — is already framework-generic React Router 7 and
would move unchanged. Note that seam 2 is exactly what `createContext()` replaces, so the
middleware spike and the extraction are the same piece of work.

### Dedup: `@sanity/visual-editing/react-router` already exists

It ships the React Router history adapter, `useRevalidator` integration, and the lazy shim in
an 817 B eager chunk. Our `visual-editing/` directory reimplements that seam in ~600 LOC with
a different client-detection strategy (`isServer()` vs upstream's `useSyncExternalStore`). Per
the dedup rule, `sanity-react-router` should depend on it and keep first-party code only where
we genuinely diverge — the `Query`/`useQuery` loader registry and `hasActiveLoaders`
auto-live-mode detection look like the real differentiators.

### Other findings worth tickets

- `src/vite/plugin.ts:14` sets `envPrefix: ['SANITY_STUDIO_']`, which **replaces** Vite's
  default, so consumers silently lose `VITE_*` client env vars.
- `src/vite/plugin.ts:70` hardcodes `@sanity/react-loader`'s internal file layout
  (`/dist/index.js`); breaks silently on any upstream restructure. The plugin has no tests.
- `"sideEffects": false` lets bundlers erase the module-scope "client only" throws in all four
  `.client` modules, so those tripwires are absent from the built worker bundle.
- Untested: `provider.tsx`, `image.ts`, `vite/plugin.ts`, `preview/session.ts`,
  `preview/utils.ts`, `preview/hooks.ts`, `visual-editing/useQuery.tsx`, and the three lazy
  wrappers.
- `context.ts:358` — `return await (previewEnabled ? this.loadQuery : this.fetch)(…)` loses the
  receiver; works only because neither method uses `this`.
- `@sanity/comlink` (408 K installed) lands in the Oxygen worker bundle, pulled transitively.
  Worth confirming which server path actually needs it.
- **Issue #185** (`studioUrl` not serialized to the client, so `encodeDataAttribute` returns
  `undefined`). #192 landed on `main` closing it via docs (`20d44d0`) rather than the suggested
  `SanityProviderValue` change — confirm that shape is what we want before closing the issue.

## Architecture verdict

Three approaches were argued adversarially — incremental hardening, a React Router
middleware-native redesign, and a ports-and-adapters layering — then scored by a fresh judge
that verified the load-bearing claims itself.

**Incremental hardening won, with two grafts.** The deciding factor: the zero-cost invariant is
an _export-map_ problem, and the two more ambitious proposals both point away from it. The
middleware camp's build-enforced boundary protects the **client** bundle while the measured leak
is in the **worker**; the ports camp concedes ports contribute nothing to preview cost.

**Graft 1 — `createContext()` without middleware.** Export
`sanityContext: RouterContext<SanityContext>` and read it via `context.get(sanityContext)` in
`preview/route.ts`, deleting three `as SanityContext` casts (`:9`, `:51`, `:117`). The judge
verified `hydrogenContext.set(sanityContext, sanity)` already works today through Hydrogen's
Proxy — so middleware's one real benefit costs ~10 lines. Additive; `context.sanity` keeps
working. Ship a thin accessor, because the raw throw is only `No value found for context`.

**Graft 2 — the `SanitySession` port.** Replaces the `SanityPreviewSession | HydrogenSession`
union and collapses three inconsistent duck-type guards (`utils.ts:118-126`, `:132-145`,
`preview/utils.ts:16`) into one. Verified scope: two keys (`projectId`, `perspective`), eight
call sites. Cheap, and it kills `vi.mock('@shopify/hydrogen')` in `context.test.ts:27-39` when
paired with an _internal_ injectable `withCache`.

**Middleware deferred.** Not because it is wrong in principle — `hydrogenPreset()` already
force-enables `v8_middleware: true` and our example applies it, so it is the runtime we ship on
— but because: the `Set-Cookie` collision at `examples/storefront/server.ts:34` is confirmed
destructive (`headers.set` replaces, so a middleware-appended preview cookie is destroyed);
Hydrogen 2026.4.2 exports no middleware of its own, so we would split setup across two
mechanisms; and the "middleware → root loader data → React context" channel fails in the error
path, which the template itself demonstrates (`root.tsx:184`, `if (!data) return <Outlet/>`).
Revisit when Hydrogen moves context creation into middleware.

**`clientMiddleware` deferred too** — verified that with `v8_splitRouteModules` on, the
`clientMiddlewareModule` chunk is eagerly imported in the hydration script for matched routes,
and it does not run on initial hydration, so it cannot beat `React.lazy` on first load.

### Claims that turned out to be false

- **`loadQuery` is not needed as public API.** It was the sole argument for keeping four query
  entry points, on the grounds that only it returns `QueryResponseInitial` for
  `<Query options={{initial}}>`. But `Query.tsx:52-55` types `initial` as
  `ClientReturn<…> | QueryResponseInitial<…>` and `Query.client.tsx:52-56` unwraps
  `'data' in options.initial`. The API can collapse to `query` + `client`.
- **The upstream visual-editing swap is not a five-prop deletion.** `onConnect`/`onDisconnect`
  and the `StegaConfig` passthrough live in `LiveMode.client.tsx`, which uses
  `@sanity/react-loader`'s `useLiveMode` and is untouched by the swap. It replaces
  `hooks/history.ts` + `hooks/refresh.ts` only. Real cost: we lose an `isProgrammaticNavRef`
  dedup guard (`hooks/history.ts:15,24,30,41`) that upstream has no equivalent for — worth an
  upstream PR.
- **The cache port does not need a required `addDebugData`.** Both `fn: () => T | Promise<T>`
  and an optional `addDebugData?` typecheck against installed Hydrogen types, so the port is
  cleaner than its own advocate claimed.
- **`README.md:968-978` documents an API that cannot work** — `const {withCache} = context` and
  `withCache('home', CacheLong(), …)`. Hydrogen's context bag has no `withCache`, and
  `createWithCache` returns `{run, fetch}`, not a callable.

## Enforcing the invariant

Measured ground truth. The preview stack is **66,163 B of 663,360 B (10.0%)** of the example's
Oxygen worker bundle, from `dist/server/metafile.server.json`. Runtime probe via Node
`module.register()` load hooks: a bare `import('dist/index.js')` evaluates **102 modules, 8 of
them preview-only**; with the static `react-loader` imports patched out, **97 / 3**.

**The leak is four static edges, not one:**

| Edge                                                           | Cost                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/index.ts:11` → `useEncodeDataAttribute`                   | the originally-spotted one                                             |
| `src/index.ts:7` → `useQuery.tsx:1` → `@sanity/react-loader`   | **transitive** — a lint rule scoped to `index.ts` misses it            |
| `src/index.ts:8` → `@sanity/core-loader/create-data-attribute` | a 150-byte shim re-exporting **32 KB** of `@sanity/visual-editing-csm` |
| `src/utils.ts:7` → `@sanity/preview-url-secret/constants`      | genuine 2,398 B dependency-free leaf                                   |

### Byte budgets cannot express this — proven, not assumed

`size-limit` was tested against two real variants of `dist/`: leaky **87.86 kB** vs clean
**87.87 kB**. The clean one is _marginally larger_. `@size-limit/esbuild` bundles without code
splitting, and esbuild inlines `import()` targets when splitting is off, so the measurement is
of the total shipped graph — exactly the quantity that does not change when an import moves from
static to dynamic.

Worse, the same is true in the worker: `examples/storefront/dist/server/index.js` is a **single
645 KB file with dynamic imports inlined** (only 2 `import(` sites survive). So static→dynamic
barely moves worker bytes. What it changes is **cold-start module evaluation** — which is why the
gate has to be graph- and evaluation-shaped, not byte-shaped.

### Adopt three mechanisms

1. **Build-output static-graph assertion (primary).** Walk the emitted `dist` graph with
   `es-module-lexer`; `imp.d === -1` is the static-vs-dynamic discriminator, and types are
   already erased in `dist`, so the type/value problem disappears. Verified against the real
   `dist`: found exactly the four leaks, ignored all three legitimate `await import()` sites.
   Transitive for free, so nothing needs a hand-maintained path list. **CI note:** the `test` job
   runs with no build, so this belongs as a step in the `build` job after `prepublishOnly`.
2. **oxlint `no-restricted-imports` with `allowTypeImports` (fast local feedback).** Verified
   working at 1.75.0: correctly flags `export {useEncodeDataAttribute} from …` and correctly
   passes `export type * from …`. Limitation confirmed against the schema — it _cannot_ exempt
   dynamic `import()`, so the three lazy sites need `oxlint-disable-next-line` annotations. Those
   are self-cleaning because `reportUnusedDisableDirectives` is already `"error"`. **This is an
   existing Sanity convention, not an invention:** `sanity-io/cli` bans the static `sanity` import
   with `allowTypeImports: true` and forces resolution through a lazy accessor.
3. **Runtime module-evaluation probe.** `module.register()` load hook asserting zero preview
   modules evaluated on a bare root-entry import. This is the only mechanism that matches the
   invariant _as stated_ and the only one that survives a bundler which inlines `import()` —
   i.e. Oxygen.

**Do not adopt** `size-limit`/`bundlewatch` for this rule (proven blind). `dependency-cruiser`
_can_ express it precisely — verified against real `src/`, found exactly the four edges with zero
false positives using `to: {dynamic: false, dependencyTypesNot: ['type-only']}` — but it is
dominated by mechanism 1: same per-edge expressiveness, no transitivity, plus a hand-maintained
critical-path list and a new dependency.

`@sanity/pkg-utils@10.4.7` gives us none of this: its per-entry sizes are display-only with no
threshold, and `--strict` is export-map hygiene only. No `publint`/`attw` in v10 — those arrive
in the tsdown successor. No sanity-io repo currently gates bundle size or dependency boundaries.

### One decision to make

`createDataAttribute` (`src/index.ts:8`) pulls 32 KB of `visual-editing-csm` into the critical
path. Either allowlist it and accept the cost, or make it lazy. `preview-url-secret/constants` is
a 2,398 B dependency-free leaf and is probably fine to allowlist.

### De-risk before writing code

The entry-point split is **not yet verified to fix the leak.** `@sanity/preview-url-secret` is a
hard dependency of `preview/route`, so it may drag the loader stack in through a path the
export-map split cannot cut. Rebuild the example on the current tree (the analysed metafile is
dated May 5), re-measure, then prototype the split and confirm the stack drops out of
`dist/server/index.js`. That measurement is what orders everything else.
