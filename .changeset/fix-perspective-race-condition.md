---
"hydrogen-sanity": patch
---

fix(context): use `sanity-preview-perspective` URL param as authoritative perspective source

Fixes intermittent perspective switching in Sanity Presentation / Visual Editing.

When the Presentation tool switches perspective it fires two things simultaneously:
1. `PUT /api/preview` to update the session cookie (async, may lag)
2. Reloads the preview iframe with an updated `sanity-preview-perspective` URL param

If the iframe reloads before the `Set-Cookie` response is applied by the browser,
`getPerspective(session)` returns a stale value. Reading the URL param first avoids
this race condition.

Also passes the resolved perspective explicitly to `loadQuery` to guard against the
`setServerClient` singleton in `@sanity/react-loader` holding a stale perspective
from a prior request on the same worker isolate.
