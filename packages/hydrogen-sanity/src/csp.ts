import type {SanityClient} from '@sanity/client'

import {once} from './utils'

const warnUseProjectHostnameFalse = once(() => {
  console.warn(
    'CSP helpers: useProjectHostname: false detected. This configuration is not recommended for Hydrogen storefronts and may result in suboptimal performance.',
  )
})

/**
 * CSP directive values for Sanity integration.
 * These are only necessary for browser requests when using Content Security Policy headers.
 */
export interface SanityCSPDirectives {
  /**
   * Asset CDN URL for images and files (browser requests only)
   * @example "https://cdn.sanity.io/star/abc123/next/star"
   */
  assetCdn: string

  /**
   * API endpoint for real-time connections (browser requests only)
   * @example `https://projectId.api.sanity.io` or `https://my-api.com`
   */
  api: string

  /**
   * API CDN URL for data queries (browser requests only)
   * @example `https://projectId.apicdn.sanity.io` or `https://my-apicdn.com`
   */
  apiCdn: string
}

/**
 * Creates CSP directive helpers for Sanity integration
 *
 * @param client - Sanity client instance
 * @returns Object with individual CSP directive values
 *
 * @example
 * ```ts
 * const client = createClient({ projectId: 'abc123', dataset: 'production' })
 * const csp = createSanityCSPHelpers(client)
 *
 * createContentSecurityPolicy({
 *   defaultSrc: [csp.assetCdn, csp.apiCdn],
 *   connectSrc: [csp.api],
 * })
 * ```
 */
export function createSanityCSPHelpers(client: SanityClient): SanityCSPDirectives {
  const {projectId, dataset, apiHost, useProjectHostname} = client.config()

  if (!projectId || !dataset) {
    throw new Error('Sanity client must have projectId and dataset configured')
  }

  if (useProjectHostname === false) {
    warnUseProjectHostnameFalse()
  }

  const apiUrl = new URL(apiHost)
  const isDefaultApi = apiHost === 'https://api.sanity.io'

  // Always assume useProjectHostname: true for optimal Hydrogen performance
  const apiHostWithPort = apiUrl.host
  const basePath = apiUrl.pathname === '/' ? '' : apiUrl.pathname

  const cdnHost = isDefaultApi ? 'cdn.sanity.io' : apiHostWithPort.replace('api.', 'cdn.')
  const apicdnHost = isDefaultApi ? 'apicdn.sanity.io' : apiHostWithPort.replace('api.', 'apicdn.')

  return {
    assetCdn: `${apiUrl.protocol}//${cdnHost}${basePath}/*/${projectId}/${dataset}`,
    api: `${apiUrl.protocol}//${projectId}.${apiHostWithPort}${basePath}`,
    apiCdn: `${apiUrl.protocol}//${projectId}.${apicdnHost}${basePath}`,
  }
}
