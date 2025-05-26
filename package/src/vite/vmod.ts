/**
 * Utility functions for handling virtual modules in Vite plugins.
 * Virtual modules are a scheme that allows passing build-time information to source files
 * using normal ESM import syntax.
 *
 * @see https://vite.dev/guide/api-plugin#virtual-modules-convention
 * @see https://github.com/remix-run/remix/blob/1fd422aae7f01e20f0a03245ca71b9e38814b9ef/packages/remix-dev/vite/vmod.ts
 */

/**
 * Creates a virtual module ID that users can import in their code.
 * The ID is prefixed with 'virtual:sanity/' to follow Vite's convention and avoid collisions.
 *
 * @example
 * ```ts
 * // In user code:
 * import { something } from 'virtual:sanity/config'
 *
 * // In plugin:
 * const moduleId = id('config') // returns 'virtual:sanity/config'
 * ```
 */
export const id = (name: string): `virtual:sanity/${string}` => `virtual:sanity/${name}`

/**
 * Transforms a virtual module ID into its internal resolved form by adding the '\0' prefix.
 * This prefix prevents other plugins from trying to process the ID and is required for
 * proper sourcemap handling.
 *
 * @example
 * ```ts
 * const resolvedId = resolve('virtual:sanity/config')
 * // returns '\0virtual:sanity/config'
 * ```
 */
export const resolve = (moduleId: string): `\0${string}` => `\0${moduleId}`

/**
 * Creates a browser-accessible URL for a virtual module ID.
 * This is used internally by Vite to handle virtual module imports in the browser.
 * The '\0' character is encoded as '__x00__' in the URL.
 *
 * @example
 * ```ts
 * const browserUrl = url('virtual:sanity/config')
 * // returns '/@id/__x00__virtual:sanity/config'
 * ```
 */
export const url = (moduleId: string): `/@id/__x00__${string}` => `/@id/__x00__${moduleId}`
