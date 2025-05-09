/**
 * @see https://vite.dev/guide/api-plugin#virtual-modules-convention
 * @see https://github.com/remix-run/remix/blob/1fd422aae7f01e20f0a03245ca71b9e38814b9ef/packages/remix-dev/vite/vmod.ts
 */
export const id = (name: string) => `virtual:sanity/${name}`
export const resolve = (id: string) => `\0${id}`
export const url = (id: string) => `/@id/__x00__${id}`
