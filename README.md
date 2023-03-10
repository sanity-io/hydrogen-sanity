# To Do
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

# Example

## Inject Sanity client into Hydrogen request context
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

## Query Sanity data in Hydrogen
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