# Shopify Hydrogen development

This storefront is scaffolded from Shopify's Hydrogen React Router template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts).

## No store yet?

Until a store is connected, this project reads [mock.shop](https://mock.shop): a public, auth-free Storefront API backed by fictional stores. There are more than 100 sample stores, each on its own host with its own catalog.

- The directory at https://mock.shop/llms.txt lists every store with what it sells and its API URL. The default, `mock.shop` itself, is apparel basics.
- To build against a different store, set `PUBLIC_STORE_DOMAIN` in `.env` to that store's host (for example `pets.mock.shop`) and leave `PRIVATE_STOREFRONT_API_TOKEN` empty. Each store describes its own catalog at `https://<store>.mock.shop/llms.txt`.
- Carts work; checkout is mocked (no payment, no real order), and the Customer Account API isn't available.
- To connect a real store, run `npx shopify hydrogen link`, then `npx shopify hydrogen env pull` to pull its environment into `.env`. Fill in any secret values the command reports it couldn't pull. On Oxygen, a linked storefront injects `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`, and `PRIVATE_STOREFRONT_API_TOKEN` for you. `PUBLIC_STOREFRONT_ID` is optional for Storefront API access; it enables Hydrogen analytics, and no other analytics IDs are needed.

## Sanity

This storefront reads editorial content from Sanity with [`hydrogen-sanity`](https://github.com/sanity-io/hydrogen-sanity). Shopify stays the source of truth for products, prices and inventory. Sanity Connect syncs product and collection data into Sanity, where the `store` fields are read-only.

- `server.ts` sets `context.sanity` from `createRequestSanityContext` (`app/lib/sanity/context.ts`). Set it there, not in middleware: `hydrogen-sanity/preview/route` reads `context.sanity` as a property.
- In loaders, fetch with `context.sanity.query(QUERY, params)` and render with `<Query query={QUERY} options={{initial}}>`. Outside preview mode this is a cached API CDN fetch. In preview mode it adds live updates and click-to-edit. Don't set `useCdn` or `cacheMode`; the defaults are the recommended setup.
- Write queries with `defineQuery` from `groq`, then run `pnpm codegen` to regenerate `sanity.generated.d.ts`.
- Render Sanity images with `Image` from `hydrogen-sanity`, not `<img>` with a built URL.
- Preview mode needs `SESSION_SECRET` and `SANITY_PREVIEW_TOKEN`. Without them the storefront renders published content only. `/api/preview` is the Presentation tool's preview mode route.
- `app/lib/sanity/stega.ts` holds the stega `filter`. It's imported on the server (`context.ts`) and the client (`root.tsx`), because functions can't cross the boundary in loader data.
