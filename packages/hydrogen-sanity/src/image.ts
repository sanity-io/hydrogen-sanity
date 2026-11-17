import type {ImageUrlBuilder, SanityImageSource, SanityModernClientLike} from '@sanity/image-url'
import {createImageUrlBuilder} from '@sanity/image-url'
import {useMemo} from 'react'

import {useSanityProviderValue} from './provider'

export {Image, type ImageProps} from './image/Image'
export {
  getImageProps,
  type GetImagePropsOptions,
  type ImageAttributes,
  type SrcSetOptions,
} from './image/getImageProps'
export {imageLoader, type ImageLoader, type ImageLoaderParams} from './image/imageLoader'
export type {InferImageValue, InferStrictImageValue} from './image/infer'
export type {ImageSource} from './image/resolveImageSource'
export {isImageWithAsset} from '@sanity/image-url'

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

export type * from '@sanity/image-url'
