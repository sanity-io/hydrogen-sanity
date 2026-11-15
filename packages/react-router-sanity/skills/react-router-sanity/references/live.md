# Live content

Read this when the task touches `<SanityLive>`, the invalidation route or the Sync Tag Invalidate
Function.

## Browser: `<SanityLive>`

Mount `<SanityLive />` once in `app/root.tsx`. It subscribes to the Live Content API after
hydration. On an event, it compares the event tags with the `syncTags` that routes return, and
revalidates only on a match. Every loader that fetches MUST return `syncTags`.

Without a function, `<SanityLive>` sends the event id on the revalidation request, so the API CDN
returns content at least as new as the event.

## Server: Sync Tag Invalidate Function → app cache

1. Mount the route:

   ```ts
   // app/routes/api.sanity.invalidate.ts
   export {action} from 'react-router-sanity/live/route'
   ```

2. Set `live: {secret: env.SANITY_LIVE_SECRET, waitFor: 'function'}` in the middleware config.
3. In the function, purge the app, then release the event:

   ```ts
   import {notifyApp} from 'react-router-sanity/live/function'

   await notifyApp({url: 'https://example.com/api/sanity/invalidate', secret, tags: syncTags})
   await context.done(syncTags)
   ```

The route checks an HMAC-SHA256 signature with a timestamp and rejects calls older than 5 minutes.
Deploy one function per dataset.

## CDN purge

`live: {onInvalidate: async (tags) => purgeCdnByTag(tags)}` runs after the app-cache purge.
