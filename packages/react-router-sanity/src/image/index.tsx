/**
 * Responsive images from the Sanity image CDN. No hooks and no effects: safe in server components.
 *
 * @packageDocumentation
 */
import {getImageDimensions, getProject} from '@sanity/asset-utils'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import type {ComponentProps, CSSProperties, JSX} from 'react'

/**
 * Describes an image field value. Project `asset->{_id, url, metadata {lqip}}` in the query to
 * enable the blur placeholder.
 *
 * @public
 */
export interface SanityImageValue {
  /** Gives the asset reference, or the expanded asset document. */
  asset?: {
    _ref?: string
    _id?: string
    url?: string
    metadata?: {lqip?: string}
  } | null
  /** Gives the crop that the editor set in Studio. */
  crop?: {top: number; bottom: number; left: number; right: number} | null
  /** Gives the focal point that the editor set in Studio. */
  hotspot?: {x: number; y: number; width: number; height: number} | null
  /** Gives the alternative text, when the schema has an `alt` field. */
  alt?: string | null
}

/**
 * Identifies the project and dataset of an image.
 *
 * @public
 */
export interface SanityImageConfig {
  /** Identifies the Sanity project. */
  projectId: string
  /** Identifies the dataset. */
  dataset: string
  /**
   * Sets the image CDN origin. Set it when the client uses a custom `apiHost`, for example
   * `https://cdn.sanity.work` for `https://api.sanity.work`.
   *
   * @defaultValue `'https://cdn.sanity.io'`
   */
  baseUrl?: string
}

/**
 * Sets the props of `<SanityImage>`.
 *
 * @public
 */
export interface SanityImageProps
  extends Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'width' | 'height' | 'placeholder'> {
  /** Gives the image field value. */
  value: SanityImageValue
  /**
   * Identifies the project and dataset. Leave it out when the query expands `asset->url`, because
   * the URL contains both values.
   */
  config?: SanityImageConfig
  /** Sets the `sizes` attribute. The browser uses it to pick a width from `srcset`. */
  sizes?: string
  /**
   * Sets the widths in `srcset`. The component drops widths above the intrinsic width.
   *
   * @defaultValue `[320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560]`
   */
  widths?: number[]
  /** Crops the image to an aspect ratio (width divided by height). The crop respects the hotspot. */
  aspectRatio?: number
  /**
   * Sets the image quality from 0 to 100.
   *
   * @defaultValue 75
   */
  quality?: number
  /** Loads the image first. Use it for the largest image above the fold. */
  priority?: boolean
  /**
   * Shows the LQIP as a blurred background while the image loads.
   *
   * @defaultValue `'blur'` when the value has `asset.metadata.lqip`
   */
  placeholder?: 'blur' | 'none'
}

const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560]

const DEFAULT_CDN = 'https://cdn.sanity.io'

/**
 * Reads the project, the dataset and the CDN origin from an expanded asset URL.
 *
 * `getProject` from `@sanity/asset-utils` drops the host, so a staging or custom CDN URL would
 * become a `cdn.sanity.io` URL. The function keeps the origin of the asset URL. It falls back to
 * the `/images/<project>/<dataset>/` path when `getProject` cannot read the URL.
 */
function projectFromUrl(url: string): SanityImageConfig | undefined {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return undefined
  }
  const baseUrl = parsed.origin === DEFAULT_CDN ? {} : {baseUrl: parsed.origin}
  try {
    return {...getProject(url), ...baseUrl}
  } catch {
    const match = parsed.pathname.match(/^\/images\/([^/]+)\/([^/]+)\//)
    return match?.[1] && match[2] ? {projectId: match[1], dataset: match[2], ...baseUrl} : undefined
  }
}

function resolveConfig(value: SanityImageValue, config?: SanityImageConfig): SanityImageConfig | undefined {
  if (config) return config
  const url = value.asset?.url
  return url ? projectFromUrl(url) : undefined
}

function toSource(value: SanityImageValue): SanityImageSource | undefined {
  const ref = value.asset?._ref ?? value.asset?._id
  if (!ref) return undefined
  return {
    asset: {_ref: ref},
    ...(value.crop ? {crop: value.crop} : {}),
    ...(value.hotspot ? {hotspot: value.hotspot} : {}),
  }
}

function croppedSize(value: SanityImageValue, ref: string): {width: number; height: number} | undefined {
  try {
    const {width, height} = getImageDimensions(ref)
    const crop = value.crop
    if (!crop) return {width, height}
    return {
      width: Math.round(width * (1 - crop.left - crop.right)),
      height: Math.round(height * (1 - crop.top - crop.bottom)),
    }
  } catch {
    return undefined
  }
}

/**
 * Returns an image URL builder for an image value.
 *
 * @param value - The image field value.
 * @param config - The project and dataset. Leave it out when the value has `asset.url`.
 * @returns The builder, or `undefined` when the value has no asset.
 * @example
 * ```ts
 * const url = urlFor(page.image, {projectId, dataset})?.width(1200).auto('format').url()
 * ```
 * @public
 */
export function urlFor(value: SanityImageValue, config?: SanityImageConfig) {
  const source = toSource(value)
  const resolved = resolveConfig(value, config)
  if (!source || !resolved) return undefined
  return createImageUrlBuilder(resolved).image(source)
}

/**
 * Renders a responsive image from the Sanity image CDN.
 *
 * The component builds `srcset` with automatic format and applies the crop and hotspot. It sets
 * `width` and `height` from the asset dimensions to stop layout shift. It shows an LQIP placeholder.
 *
 * @param props - The image value and the image options.
 * @returns An `img` element, or `null` when the value has no asset.
 * @example
 * ```tsx
 * <SanityImage value={page.image} sizes="(min-width: 64rem) 50vw, 100vw" alt={page.image.alt ?? ''} />
 * ```
 * @public
 */
export function SanityImage({
  value,
  config,
  sizes = '100vw',
  widths = DEFAULT_WIDTHS,
  aspectRatio,
  quality = 75,
  priority = false,
  placeholder,
  style,
  alt,
  ...rest
}: SanityImageProps): JSX.Element | null {
  const builder = urlFor(value, config)
  const ref = value.asset?._ref ?? value.asset?._id
  if (!builder || !ref) return null

  const intrinsic = croppedSize(value, ref)
  const ratio = aspectRatio ?? (intrinsic ? intrinsic.width / intrinsic.height : undefined)
  const maxWidth = intrinsic?.width ?? Math.max(...widths)
  const candidates = [...new Set(widths.filter((width) => width <= maxWidth))].sort((a, b) => a - b)
  if (candidates.length === 0) candidates.push(maxWidth)

  const urlForWidth = (width: number) => {
    let image = builder.width(width).auto('format').quality(quality)
    if (aspectRatio) image = image.height(Math.round(width / aspectRatio)).fit('crop')
    return image.url()
  }

  const largest = candidates[candidates.length - 1] ?? maxWidth
  const lqip = value.asset?.metadata?.lqip
  const blur = (placeholder ?? (lqip ? 'blur' : 'none')) === 'blur' && lqip
  const placeholderStyle: CSSProperties = blur
    ? {backgroundImage: `url(${lqip})`, backgroundSize: 'cover', backgroundPosition: 'center'}
    : {}

  return (
    <img
      {...rest}
      alt={alt ?? value.alt ?? ''}
      src={urlForWidth(Math.min(largest, 1024))}
      srcSet={candidates.map((width) => `${urlForWidth(width)} ${width}w`).join(', ')}
      sizes={sizes}
      width={largest}
      height={ratio ? Math.round(largest / ratio) : undefined}
      loading={priority ? 'eager' : (rest.loading ?? 'lazy')}
      fetchPriority={priority ? 'high' : rest.fetchPriority}
      decoding={rest.decoding ?? 'async'}
      style={{...placeholderStyle, ...style}}
    />
  )
}
