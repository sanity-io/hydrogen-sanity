# Security

Read this when the task touches tokens, cookies, preview access, CSP or the invalidation route.

| Threat                              | What the SDK does                                                              | What you must do                                     |
| ----------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Token in the browser                | `serverToken` stays on the server; root data has an allowlist of fields       | Never put a token on `createClient`                  |
| Server code in a client bundle      | Server entries throw `RRS001` under the `browser` condition                    | Import them only in server modules                   |
| Unauthorized preview                | Validates the one-hour secret against the Content Lake                        | Do not log preview URLs                              |
| Preview response in a shared cache  | `Cache-Control: private, no-store`; CDN tag headers removed                    | Do not override `Cache-Control` in preview           |
| CSRF on perspective change and exit | Requires a matching `Origin`, a live session, a strict perspective value      | Keep the route on the same origin                    |
| Session tampering                   | Signed cookie with secret rotation                                             | Put the new secret first in `sessionSecrets`         |
| Third-party cookie blocking         | `Partitioned` cookie in a cross-site iframe                                    | Serve the app over HTTPS                             |
| Forged invalidation                 | HMAC-SHA256 with a timestamp, 5-minute window                                  | Keep `SANITY_LIVE_SECRET` secret                     |
| Framing                             | `getSanityCspDirectives(context)` adds the Studio and Dashboard to `frame-ancestors` in preview only | Merge it into your CSP; see `csp.md` |

Optional: `preview.allowedStudioOrigins` limits preview entry to known Studio origins.

`preview.browserToken` sends a Viewer token to every editor's browser in preview. Use it only for
live drafts (L2).
