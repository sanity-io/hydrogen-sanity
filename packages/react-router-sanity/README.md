# react-router-sanity

> **First draft.** Not published. See [DECISIONS.md](./DECISIONS.md) for what this draft decided
> and what it defers.

Sanity for React Router framework mode: one middleware, one `fetch`, an app cache, preview and
Presentation, live content and images. Works with or without Shopify Hydrogen.

- React Router 8, or 7.9+ with `future.v8_middleware: true`
- `@sanity/client` 7.28+ or 8.11+
- Node 22.12+, Cloudflare Workers, Shopify Oxygen

## Quick start

```ts
// app/lib/sanity.server.ts
import {createClient} from '@sanity/client'
import {createSanityMiddleware} from 'react-router-sanity/server'

export const sanityMiddleware = createSanityMiddleware(() => ({
  client: createClient({projectId: 'your-id', dataset: 'production', apiVersion: '2026-11-01', useCdn: true}),
}))
```

```tsx
// app/root.tsx
export const middleware: Route.MiddlewareFunction[] = [sanityMiddleware]

export function loader({context}: Route.LoaderArgs) {
  return {sanity: context.get(sanityContext).getRootData()}
}
```

```ts
// app/routes/page.tsx
export async function loader({context, params}: Route.LoaderArgs) {
  const {data, syncTags} = await context.get(sanityContext).fetch({query: PAGE_QUERY, params})
  return {page: data, syncTags}
}
```

Full setup, with preview, live content and caching: [setup guide](./skills/react-router-sanity/references/setup.md).

## For agents

Read [`llms.txt`](./llms.txt), then the [skill](./skills/react-router-sanity/SKILL.md). The
installed package is the source of truth.

## Development

```sh
pnpm --filter react-router-sanity build
pnpm --filter react-router-sanity test        # unit tests (vitest)
pnpm --filter react-router-sanity check       # graph, evaluation, conditions, docs, package gates
pnpm --filter @repo/example-react-router test:e2e   # Playwright against the example app
```

| Gate                 | Script                         | Spec |
| -------------------- | ------------------------------ | ---- |
| Static import graph  | `scripts/check-graph.mjs`      | 7.1.1 |
| Module evaluation    | `scripts/check-eval.mjs`       | 7.1.2 |
| Condition matrix     | `scripts/check-conditions.mjs` | 7.1.5 |
| TSDoc + STE          | `scripts/check-docs.mjs`       | 12.2 |
| publint + attw       | `check:package`                | 7.1.4 |
| No preview chunk, budget | `examples/react-router/e2e` | 7.2.1–7.2.3 |
