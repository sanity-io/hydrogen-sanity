# Hydrogen client for Sanity
> ⚠️ NOTE: This is an example project and should not be used for production purposes as-is

In Hydrogen, Shopify provides a [client that is injected into the request context](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/fetch-data#step-1-create-and-inject-the-storefront-client) and [used to perform queries](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/fetch-data#step-2-call-the-storefront-client-in-remix-loaders-and-actions) to the Storefront API. This project is an exploration into ways of creating a similar client for the Sanity API and ultimately reduce [boilerplate code](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#cache-data-from-third-party-apis).

## To Do
- [ ] Determine what configuration options the client would need
```ts
type CreateSanityClientOptions = {
    // Sanity options
    /** Sanity project ID */
    projectId: string;
    /** Sanity dataset name */
    dataset: string;
    /** Sanity API version */
    apiVersion?: string;
    /**
     * Use CDN-distributed, cached version of the Sanity API
     * @see https://www.sanity.io/docs/api-cdn
     * @defaultValue true
     */
    useCdn: boolean = true
    /** 
     * Sanity token to authenticate requests 
     * @see https://www.sanity.io/docs/http-auth
     */
    token?: string

    // Environment
    /** 
     * A Cache API instance.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
     */
    cache?: Cache;
    /** 
     * A runtime utility for serverless environments
     * @see https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#waituntil
     */
    waitUntil?: ExecutionContext['waitUntil']
}
```
- [ ] What should the scope of a package be? Is this just a [Facade](https://en.wikipedia.org/wiki/Facade_pattern)? Should it just be helpers to make working with Sanity easier, and require less [boilerplate](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#cache-data-from-third-party-apis)? Should it help with caching images as well?
> ℹ [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits)

## Example

### Inject Sanity client into Hydrogen request context
`<root>/server.js`
```ts
import {createSanityClient} from '@sanity/hydrogen';

export default {
  async fetch(request, env, executionContext) {
    // ...storefront client creation, etc.

    /* Create a Sanity client with your credentials and options */
    const {sanity} = createSanityClient({
      /* Cache API instance */
      cache: await caches.open('sanity'),
      // ...whatever other config
    });

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      /* Inject the Storefront and Sanity clients in the Remix context */
      getLoadContext: () => ({storefront, sanity}),
    });

    return handleRequest(request);
  },
};
```

### Query Sanity data in Hydrogen
`<root>/app/routes/products/$productHandle.jsx`
```tsx
export async function loader({params, context: {storefront, sanity}}) {
  const {product} = await storefront.query(
    `#graphql
      query Product($handle: String!) {
        product(handle: $handle) { id title }
      }
    `,
    {
      variables: {handle: params.productHandle},
      /**
       * Product titles aren't updated often so they can be cached for a long period.
       */
      cache: storefront.CacheLong(),
    },
  );

  const recommendedPromise = sanity.query(
    `#groq
      // some groq query
    `,
    {
      variables: {productId: product.id},
      /**
       * Since the recommendation list might change often, cache them for a short period.
       */
      cache: storefront.CacheShort(),
    },
  );

  return defer({product, recommended: recommendedPromise});
}

export default function Product() {
  const {product, recommended} = useLoaderData();

  // ...
}
```