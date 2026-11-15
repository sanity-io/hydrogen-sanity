# Content Security Policy

Read this when the app sends a `Content-Security-Policy` header, or when Presentation shows
"refused to frame" or the overlays have no styles.

## What Sanity needs

`getSanityCspDirectives(context)` returns the sources for the current request. It reads the
client config, `studioUrl` and the preview state from the Sanity middleware.

| Directive        | Sources                                                    | When          |
| ---------------- | ---------------------------------------------------------- | ------------- |
| `connectSrc`     | `https://<projectId>.api.sanity.io`, `https://<projectId>.apicdn.sanity.io` | always |
| `imgSrc`         | `https://cdn.sanity.io/images/<projectId>/<dataset>/`      | always        |
| `mediaSrc`       | `https://cdn.sanity.io/files/<projectId>/<dataset>/`       | always        |
| `styleSrc`       | `'unsafe-inline'` (browsers ignore it when `style-src` has a nonce) | preview |
| `frameAncestors` | `'self'`, the Studio origin, `https://www.sanity.io` (Dashboard) | preview  |

A custom `apiHost` changes every host (`api.sanity.work` → `p1.api.sanity.work`,
`cdn.sanity.work`). The result never contains a nonce.

## Hydrogen (2026.10+)

```ts
// app/entry.server.tsx
const csp = createContentSecurityPolicy({
  shop: {storeDomain, checkoutDomain},
  directives: getSanityCspDirectives(context),
})
```

Hydrogen appends the Sanity sources to its defaults and replaces its `frame-ancestors 'none'` in
preview.

## React Router without Hydrogen

```ts
// app/entry.server.tsx
import {createNonce, getSanityCspDirectives, serializeCsp} from 'react-router-sanity/csp'

const nonce = createNonce()
const policy = serializeCsp(
  {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`],
    styleSrc: ["'self'", `'nonce-${nonce}'`],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
  },
  getSanityCspDirectives(loadContext),
)
responseHeaders.set('Content-Security-Policy', policy)
// Pass the nonce to <ServerRouter nonce>, renderToPipeableStream({nonce}), <Scripts nonce>, <ScrollRestoration nonce>.
```

`examples/react-router/app/entry.server.tsx` is a full, tested version.

## Overlays under a strict policy

The overlays use styled-components. `<VisualEditing>` reads the nonce from the script tags that
React Router renders and writes `<meta property="csp-nonce">`. styled-components then adds the
nonce to every overlay style. You write no code for this. Pass `<VisualEditing nonce>` only if
your scripts carry no nonce.

## Rules

- MUST pass the request context: `getSanityCspDirectives(context)`. Do not hard-code Sanity hosts.
- MUST-NOT add the Studio to `frame-ancestors` outside preview. The function adds it only in preview.
- MUST-NOT cache a response with a nonce in a shared cache.
- SHOULD keep `https://www.sanity.io` in preview when editors open the Studio in the Dashboard.
  Turn it off with `getSanityCspDirectives(context, {dashboard: false})`.

## Known limit

`<SanityImage>` writes the LQIP placeholder as an inline `style` attribute. A policy without
`'unsafe-inline'` in `style-src-attr` blocks that attribute. The image still loads; only the blur
placeholder is missing.
