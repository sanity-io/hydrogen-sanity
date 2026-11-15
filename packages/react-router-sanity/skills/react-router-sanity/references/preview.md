# Preview and Presentation

Read this when the task touches preview mode, Presentation, overlays, perspectives or variants.

## Flow

1. Presentation opens `/api/preview?sanity-preview-secret=…&sanity-preview-pathname=/x`.
2. The preview route loader validates the secret against the Content Lake with `serverToken`.
   A wrong secret gives 401.
3. The loader writes a signed `HttpOnly` cookie and redirects (307) to `/x`.
4. Every later request reads drafts with the server token. The middleware sets
   `Cache-Control: private, no-store`.
5. `<VisualEditing enabled>` loads the overlays, syncs navigation with Presentation, and
   revalidates loaders on content changes.
6. When the editor changes the perspective or variant, `<VisualEditing>` sends `PUT /api/preview`.
   Studio does not reload the iframe.

## Levels

| Level | What                                    | Needs                                                  |
| ----- | --------------------------------------- | ------------------------------------------------------ |
| L1    | Server regeneration on each change      | `<VisualEditing enabled>`                              |
| L2    | Live drafts                             | `<SanityLive includeDrafts>` + `preview.browserToken` (opt-in, token in the browser) |
| L3    | Query results pushed by Studio          | `usePresentationQuery` from `react-router-sanity/optimistic` |
| L4    | Optimistic updates                      | `useOptimistic` from `react-router-sanity/optimistic`  |

Import `/optimistic` only in components that render in preview, through `lazy()`. A static import
adds its code to the route chunk in production.

## Exit preview

```tsx
<Form method="post" action="/api/preview"><button>Exit preview</button></Form>
```

## Read the state

- In components: `usePreview()` from `react-router-sanity/preview`.
- In loaders and server components: `context.get(sanityContext).preview` or `getPreview(context)`.

## Cookies

The cookie uses `Secure; SameSite=None`, and `Partitioned` inside a cross-site iframe, so it works
when the browser blocks third-party cookies. On `http://localhost` it uses `SameSite=Lax`.
