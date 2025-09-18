import {default as createImageUrlBuilder} from '@sanity/image-url'
import type {ImageUrlBuilder} from '@sanity/image-url/lib/types/builder'
import type {SanityImageSource, SanityModernClientLike} from '@sanity/image-url/lib/types/types'
import {useMemo} from 'react'

import {useSanityProviderValue} from './provider'

/**
 * Hook that returns a Sanity image URL builder configured with current provider settings.
 * Use this to create custom image transformations beyond `useImageUrl`.
 */
export function useImageUrlBuilder(): ImageUrlBuilder {
  const {projectId, dataset, apiHost} = useSanityProviderValue()
  return useMemo(() => {
    return createImageUrlBuilder({
      config: () => ({projectId, dataset, apiHost}),
    } as SanityModernClientLike)
  }, [apiHost, dataset, projectId])
}

/**
 * Hook that generates image URLs from Sanity image assets.
 * Returns a configured image URL builder for the given source.
 */
export function useImageUrl(source: SanityImageSource): ImageUrlBuilder {
  const builder = useImageUrlBuilder()
  return builder.image(source)
}

export type {ImageUrlBuilder} from '@sanity/image-url/lib/types/builder'
export type * from '@sanity/image-url/lib/types/types'
