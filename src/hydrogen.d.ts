declare module '@shopify/hydrogen' {
    // Rely on declaration merging, since Hydrogen
    // doesn't export this interface
    export interface AllCacheOptions { }

    /** @see https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies */
    export type CachingStrategy = AllCacheOptions
}