import {createContext} from 'react'

/**
 * Carries the CSP nonce of the response to `<Scripts>` and `<ScrollRestoration>` during SSR. In
 * the browser the value is `undefined`: browsers hide nonces from the DOM after parsing.
 */
export const NonceContext = createContext<string | undefined>(undefined)
