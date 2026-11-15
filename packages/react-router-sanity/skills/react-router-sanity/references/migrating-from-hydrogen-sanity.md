# Migrating from `hydrogen-sanity` 7

Read this when an app uses `hydrogen-sanity` and moves to Hydrogen 2026.10+ or to plain React
Router.

| `hydrogen-sanity` 7                                  | `react-router-sanity`                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `createSanityContext({...})` in `server.ts`           | `createSanityMiddleware(() => ({...}))` in the root `middleware`   |
| `context.sanity`                                     | `context.get(sanityContext)`                                       |
| `sanity.loadQuery(q, p)` / `sanity.query` / `sanity.fetch` | `sanity.fetch({query: q, params: p})`                         |
| `cache: CacheLong()`, `createWithCache`              | `cache: {store: webCache({cache: () => caches.open('sanity')})}`   |
| `<Sanity />` provider in `root.tsx`                  | Return `{sanity: sanity.getRootData()}` from the root loader       |
| `<VisualEditing />` with `previewMode` check         | `<VisualEditing enabled={preview.enabled} />`                      |
| `<Query query={...}>` client loader                  | `usePresentationQuery` (L3), in a lazy preview-only component      |
| `hydrogen-sanity/preview/route`                      | `react-router-sanity/preview/route`                                |
| `hydrogen-sanity/vite` plugin                        | Remove it. No plugin is needed.                                    |
| `react-router-dom`                                   | `react-router`                                                     |

Return `syncTags` from each loader, so `<SanityLive>` can match events to routes.
