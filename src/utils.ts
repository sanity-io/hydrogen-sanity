import { CachingStrategy } from "./hydrogen";

/**
 * Create an SHA-256 hash as a hex string
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
 */
export async function sha256(message: string) {
    // encode as UTF-8
    const messageBuffer = await new TextEncoder().encode(message);
    // hash the message
    const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
    // convert bytes to hex string
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

const CACHE_DIRECTIVES_MAP = new Map([
    ['maxAge', 'max-age'],
    ['staleWhileRevalidate', 'stale-while-revalidate'],
    ['sMaxAge', 's-maxage'],
    ['staleIfError', 'stale-if-error']
])

/**
 * Stringify Hydrogen caching strategy directives
 * for use in `Cache-Control` header
 * @see https://github.com/Shopify/hydrogen/blob/85ae63ac37e5c4200919d8ae6c861c60effb4ded/packages/hydrogen/src/cache/strategies.ts#L28
 */
export function getCacheControlHeader(cacheOptions: CachingStrategy): string {
    return Object.keys(cacheOptions).reduce((cacheControl, key) => {
        if (key === 'mode') {
            cacheControl.push(cacheOptions[key]!);
        } else if (CACHE_DIRECTIVES_MAP.has(key)) {
            cacheControl.push(
                `${CACHE_DIRECTIVES_MAP.get(key)}=${cacheOptions[key as keyof CachingStrategy]}`,
            );
        }

        return cacheControl
    }, new Array<string>()).join(", ")
}