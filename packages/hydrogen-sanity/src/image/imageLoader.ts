import {stegaClean} from '@sanity/client/stega'

/**
 * Parameters passed to an image loader for every `srcset` candidate. Same
 * shape as the loader of Hydrogen's `<Image>`, without `crop`: the crop and
 * hotspot are already part of `src`.
 */
export interface ImageLoaderParams {
  /** The Sanity Image CDN URL, including the crop (`rect`) and any `queryParams` */
  src: string
  width: number
  /** Set when the image has a fixed aspect ratio */
  height?: number
}

export type ImageLoader = (params: ImageLoaderParams) => string

/**
 * The default loader for `<Image>` and `getImageProps`: serves an
 * auto-formatted (AVIF/WebP) image at the requested size from the Sanity
 * Image CDN, without upscaling past the source.
 */
export const imageLoader: ImageLoader = ({src, width, height}) => {
  const url = new URL(stegaClean(src))
  url.searchParams.set('auto', 'format')
  url.searchParams.set('w', `${Math.round(width)}`)
  if (height) {
    url.searchParams.set('h', `${Math.round(height)}`)
  } else {
    url.searchParams.delete('h')
  }
  if (!url.searchParams.has('fit')) {
    url.searchParams.set('fit', height ? 'min' : 'max')
  }
  return hrefOf(url)
}

/**
 * `URLSearchParams` encodes the commas in `rect`. The CDN accepts both, but
 * keeping them literal matches the URLs `@sanity/image-url` builds.
 */
export function hrefOf(url: URL): string {
  return url.href.replaceAll('%2C', ',')
}
