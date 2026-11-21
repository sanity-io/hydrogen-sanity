export {DEFAULT_API_VERSION, DEFAULT_CACHE_STRATEGY} from './constants'
export {createSanityContext, type SanityContext} from './context'
export {
  getImageProps,
  type GetImagePropsOptions,
  Image,
  type ImageAttributes,
  type ImageLoader,
  type ImageLoaderParams,
  imageLoader,
  type ImageProps,
  type ImageSource,
  type InferImageValue,
  type InferStrictImageValue,
  isImageWithAsset,
  type SrcSetOptions,
  useImageUrl,
  useImageUrlBuilder,
} from './image'
export {Sanity, useSanityProviderValue} from './provider'
export {Query, type QueryProps} from './Query'
export {isQueryResponseInitial} from './queryResult'
export {getPerspectiveFromUrl} from './utils'
export {useQuery} from './visual-editing/useQuery'
export {createDataAttribute} from '@sanity/core-loader/create-data-attribute'
export type {EncodeDataAttributeFunction} from '@sanity/core-loader/encode-data-attribute'
export type * from '@sanity/react-loader'
export {useEncodeDataAttribute} from '@sanity/react-loader'
