import {stegaClean} from '@sanity/client/stega'
import type {CropMode, FitMode, ImageUrlBuilder} from '@sanity/image-url'
import type {ComponentPropsWithoutRef, CSSProperties} from 'react'

import {getSanityProviderValue} from '../provider'
import {hrefOf, type ImageLoader, imageLoader} from './imageLoader'
import {resolveImageDimensions} from './resolveImageDimensions'
import {
  type ImageProjectOptions,
  type ImageSource,
  imageBuilderFor,
  isSanityAssetId,
} from './resolveImageSource'
import {hotspotObjectPosition} from './resolveObjectPosition'

/**
 * Controls the widths generated for a fluid image's `srcset`, like the
 * option of the same name on Hydrogen's `<Image>`.
 */
export interface SrcSetOptions {
  /** The number of widths to generate */
  intervals: number
  /** The smallest width */
  startingWidth: number
  /** The step between widths, in pixels */
  incrementSize: number
}

const DEFAULT_SRCSET_OPTIONS: SrcSetOptions = {
  intervals: 15,
  startingWidth: 200,
  incrementSize: 200,
}

export interface GetImagePropsOptions extends Omit<
  ComponentPropsWithoutRef<'img'>,
  'src' | 'srcSet' | 'width' | 'height' | 'placeholder'
> {
  /**
   * The image to render. Either:
   * - an image object from a GROQ query (`{asset, crop, hotspot}`), applying
   *   the crop and hotspot set in the Studio,
   * - an asset document (`asset->{_id, url}`) or reference (`{_ref}`),
   * - a Sanity image asset id (`image-…`),
   * - or a URL to an image on the Sanity Image CDN, e.g. from `asset->url` or
   *   an `@sanity/image-url` builder.
   *
   * Stega-encoded metadata from Content Source Maps is stripped automatically.
   */
  src: ImageSource
  /**
   * The Sanity project the image belongs to. Defaults to the project of the
   * Sanity provider, then to the project encoded in the asset URL when the
   * query dereferences it (`asset->{url}`).
   */
  projectId?: string
  /** The Sanity dataset the image belongs to, see `projectId`. */
  dataset?: string
  /**
   * The CSS width of the image, like Hydrogen's `<Image>`. A number or a
   * fixed unit (`px`, `em`, `rem`) renders a fixed-size image with `1x`, `2x`
   * and `3x` candidates. Anything else (`100%` by default) renders a fluid
   * image with width candidates up to the size of the source image.
   */
  width?: number | string
  /** The height of a fixed-size image. Derived from the aspect ratio when omitted. */
  height?: number | string
  /**
   * The aspect ratio to render, as `width/height`, e.g. `4/5`. Defaults to the
   * aspect ratio of the image after the Studio crop. When it differs, the CDN
   * crops the image around the hotspot.
   */
  aspectRatio?: string
  /** Builds the URL for every `srcset` candidate. Defaults to {@link imageLoader}. */
  loader?: ImageLoader
  /** Changes the widths generated for fluid images. */
  srcSetOptions?: SrcSetOptions
  /**
   * Additional [Sanity Image CDN params](https://www.sanity.io/docs/image-urls)
   * merged into the image URL, e.g. `{blur: 50, sat: -100}`. Sizing params
   * (`w`, `h`, `rect`) are ignored. For image objects and asset ids, `fit`,
   * the crop mode (`crop`) and a focal point (`fp-x` and `fp-y` together) are
   * forwarded to the URL builder before it computes the crop and hotspot.
   */
  queryParams?: Record<string, string | number>
  /**
   * Fills the parent element (which needs `position: relative`) with
   * `object-fit: cover`. `object-position` defaults to the hotspot.
   */
  fill?: boolean
  /**
   * `blur` shows a blurred preview while the image loads: `blurDataURL`, or
   * `asset->metadata.lqip` when the query selects it.
   */
  placeholder?: 'blur' | 'empty'
  /** A data URL used by `placeholder="blur"`. Defaults to `asset->metadata.lqip`. */
  blurDataURL?: string
}

export type ImageAttributes = ComponentPropsWithoutRef<'img'>

const SIZING_PARAMS = new Set(['w', 'h', 'rect'])

/**
 * Every fit and crop mode `@sanity/image-url` accepts. A new mode in that
 * library fails typechecking here until it is listed.
 */
const FIT_MODES: Record<FitMode, true> = {
  clip: true,
  crop: true,
  fill: true,
  fillmax: true,
  max: true,
  scale: true,
  min: true,
}

const CROP_MODES: Record<CropMode, true> = {
  top: true,
  bottom: true,
  left: true,
  right: true,
  center: true,
  focalpoint: true,
  entropy: true,
}

type QueryParams = Record<string, string | number>

/**
 * Computes the `<img>` attributes for a Sanity image: `src`, a responsive
 * `srcSet`, `width`/`height` and the `style` that sizes it. Spread them on an
 * `<img>`, or on a `<source>` inside `<picture>` for art direction.
 *
 * Width and height are inferred, in order of precedence, from the URL's
 * `w`/`h` params, its `rect` crop param, or the original dimensions Sanity
 * encodes in every asset filename.
 *
 * @example
 * ```tsx
 * const {props} = getImageProps({src: hero.image, aspectRatio: '16/9', sizes: '100vw'})
 * return <img {...props} />
 * ```
 */
export function getImageProps(options: GetImagePropsOptions): {props: ImageAttributes} {
  const {
    src,
    projectId,
    dataset,
    width,
    height,
    aspectRatio,
    loader = imageLoader,
    srcSetOptions = DEFAULT_SRCSET_OPTIONS,
    queryParams,
    fill,
    placeholder,
    blurDataURL,
    alt,
    style,
    loading = 'lazy',
    decoding = 'async',
    ...rest
  } = options

  const source = typeof src === 'string' ? stegaClean(src) : src
  const shared = {...rest, alt: alt ?? altFrom(src) ?? '', loading, decoding}

  // data: and blob: URLs can't point to the Sanity Image CDN and don't support
  // transformation params: pass them through untouched.
  if (typeof source === 'string' && (source.startsWith('data:') || source.startsWith('blob:'))) {
    return {
      props: {
        ...shared,
        src: source,
        width: fixedPx(width),
        height: fixedPx(height),
        style: fill ? {...FILL_STYLE, ...style} : style,
      },
    }
  }

  let builder: ImageUrlBuilder | undefined
  let forwarded: ReadonlySet<string> = new Set()
  let url: URL
  if (typeof source === 'string' && !isSanityAssetId(source)) {
    try {
      url = new URL(source)
    } catch (err) {
      throw new TypeError(
        'The `src` option must be a valid URL to an image on the Sanity Image CDN.',
        {
          cause: err,
        },
      )
    }
  } else {
    const built = withBuilderQueryParams(
      imageBuilderFor(source, projectOptions(projectId, dataset)),
      queryParams,
    )
    builder = built.builder
    forwarded = built.forwarded
    url = new URL(builder.url())
  }
  applyQueryParams(url, queryParams, forwarded)

  const intrinsic = resolveImageDimensions(url)
  const intrinsicRatio = intrinsic && intrinsic.height / intrinsic.width
  const fixedWidth = fill ? undefined : fixedPx(width)
  const fixedHeight = fill ? undefined : fixedPx(height)
  const ratio = fill
    ? undefined
    : (parseAspectRatio(aspectRatio) ??
      (fixedWidth && fixedHeight ? fixedHeight / fixedWidth : intrinsicRatio))

  // Rebuild image objects at the requested aspect ratio, so the CDN crop is
  // positioned around the hotspot. The loader sets the final `w` and `h`.
  let served = intrinsic
  let aspectCropped = false
  if (builder && intrinsic && intrinsicRatio && ratio && Math.abs(ratio - intrinsicRatio) > 0.001) {
    url = new URL(
      builder
        .width(intrinsic.width)
        .height(Math.round(intrinsic.width * ratio))
        .url(),
    )
    url.searchParams.delete('w')
    url.searchParams.delete('h')
    applyQueryParams(url, queryParams, forwarded)
    served = resolveImageDimensions(url) ?? intrinsic
    aspectCropped = true
  }

  const baseSrc = hrefOf(url)
  const maxWidth = served?.width
  const heightFor = (candidateWidth: number) => (ratio ? candidateWidth * ratio : undefined)

  let srcSet: string
  let imgSrc: string
  let attributes: {width?: number; height?: number}
  let sizeStyle: CSSProperties

  if (fixedWidth) {
    const fixedHeightOrRatio = fixedHeight ?? heightFor(fixedWidth)
    const scaleHeight = (candidateWidth: number) =>
      fixedHeightOrRatio ? (candidateWidth * fixedHeightOrRatio) / fixedWidth : undefined
    const widths = [1, 2, 3]
      .map((density) => density * fixedWidth)
      .filter((candidate, index) => index === 0 || !maxWidth || candidate <= maxWidth)
    srcSet = widths
      .map(
        (candidate, index) =>
          `${loader({src: baseSrc, width: candidate, height: scaleHeight(candidate)})} ${index + 1}x`,
      )
      .join(', ')
    imgSrc = loader({src: baseSrc, width: fixedWidth, height: fixedHeightOrRatio})
    attributes = {
      width: fixedWidth,
      height: fixedHeightOrRatio ? Math.round(fixedHeightOrRatio) : undefined,
    }
    sizeStyle = {}
  } else {
    const {intervals, startingWidth, incrementSize} = srcSetOptions
    let widths = Array.from(
      {length: intervals},
      (_, index) => startingWidth + index * incrementSize,
    ).filter((candidate) => !maxWidth || candidate <= maxWidth)
    if (widths.length === 0) widths = [maxWidth ?? startingWidth]
    srcSet = widths
      .map(
        (candidate) =>
          `${loader({src: baseSrc, width: candidate, height: heightFor(candidate)})} ${candidate}w`,
      )
      .join(', ')
    const largest = widths[widths.length - 1]!
    imgSrc = loader({src: baseSrc, width: largest, height: heightFor(largest)})

    if (fill) {
      attributes = {}
      sizeStyle = FILL_STYLE
    } else {
      const attributeWidth = served?.width ?? (ratio ? 100 : undefined)
      const attributeHeight =
        attributeWidth && ratio ? Math.round(attributeWidth * ratio) : undefined
      // The width and height attributes reserve the aspect ratio before the
      // image loads. An inline `aspect-ratio` would also override the ratio of
      // an art-directed `<source>`.
      attributes = {width: attributeWidth, height: attributeHeight}
      sizeStyle = {width: typeof width === 'string' ? width : '100%', height: 'auto'}
    }
  }

  const objectFit = style?.objectFit ?? sizeStyle.objectFit
  const objectPosition =
    style?.objectPosition === undefined && (fill || (objectFit === 'cover' && !aspectCropped))
      ? hotspotObjectPosition(source, queryParams?.['flip'], queryParams?.['or'])
      : undefined

  const blur = placeholder === 'blur' ? (blurDataURL ?? lqipFrom(src)) : undefined

  return {
    props: {
      ...shared,
      src: imgSrc,
      srcSet,
      ...attributes,
      style: {
        ...sizeStyle,
        ...(objectPosition ? {objectPosition} : {}),
        ...(blur ? blurPlaceholderStyle(blur, objectFit) : {}),
        ...style,
      },
    },
  }
}

const FILL_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

function projectOptions(projectId?: string, dataset?: string): ImageProjectOptions {
  if (projectId || dataset) return {projectId, dataset}
  const provider = getSanityProviderValue()
  return {projectId: provider?.projectId, dataset: provider?.dataset, apiHost: provider?.apiHost}
}

/**
 * Params that change the rect `@sanity/image-url` emits, rather than CDN
 * effects applied afterwards. They have to be set on the builder before
 * `url()`: appending them later leaves the crop and hotspot computed as if
 * they were unset.
 */
function withBuilderQueryParams(
  builder: ImageUrlBuilder,
  queryParams: QueryParams | undefined,
): {builder: ImageUrlBuilder; forwarded: ReadonlySet<string>} {
  const forwarded = new Set<string>()
  if (!queryParams) return {builder, forwarded}

  let next = builder
  const fit = queryParams['fit']
  if (fit !== undefined) {
    next = next.fit(readBuilderMode(FIT_MODES, fit, 'fit'))
    forwarded.add('fit')
  }
  const crop = queryParams['crop']
  if (crop !== undefined) {
    next = next.crop(readBuilderMode(CROP_MODES, crop, 'crop'))
    forwarded.add('crop')
  }

  const focalX = queryParams['fp-x']
  const focalY = queryParams['fp-y']
  if (focalX !== undefined && focalY !== undefined) {
    const x = Number(focalX)
    const y = Number(focalY)
    if (Number.isFinite(x) && Number.isFinite(y)) {
      next = next.focalPoint(x, y)
      forwarded.add('fp-x')
      forwarded.add('fp-y')
    }
  }

  return {builder: next, forwarded}
}

function readBuilderMode<Mode extends string>(
  modes: Record<Mode, true>,
  value: string | number,
  param: 'fit' | 'crop',
): Mode {
  const mode = `${value}`
  if (Object.hasOwn(modes, mode)) return mode as Mode
  throw new TypeError(
    `Invalid \`queryParams.${param}\` value "${mode}". Expected one of: ${Object.keys(modes).join(', ')}.`,
  )
}

function applyQueryParams(
  url: URL,
  queryParams: QueryParams | undefined,
  forwarded: ReadonlySet<string>,
): void {
  if (!queryParams) return
  for (const [key, value] of Object.entries(queryParams)) {
    if (SIZING_PARAMS.has(key) || forwarded.has(key)) continue
    url.searchParams.set(key, `${value}`)
  }
}

/**
 * The size in pixels of a fixed CSS length (`100`, `100px`, `10em`, `10rem`),
 * matching how Hydrogen's `<Image>` tells fixed and fluid images apart.
 */
function fixedPx(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return value > 0 ? value : undefined
  const match = value === undefined ? null : /^(\d*\.?\d+)(px|em|rem)?$/.exec(value.trim())
  if (!match) return undefined
  const size = Number(match[1]) * (match[2] === 'em' || match[2] === 'rem' ? 16 : 1)
  return size > 0 ? size : undefined
}

/** Parses `width/height` into a height-to-width ratio. */
function parseAspectRatio(aspectRatio: string | undefined): number | undefined {
  if (!aspectRatio) return undefined
  const [w, h = '1'] = aspectRatio.split('/')
  const ratio = Number(h) / Number(w)
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

function altFrom(src: ImageSource): string | undefined {
  if (typeof src !== 'object' || src === null || !('alt' in src)) return
  return typeof src.alt === 'string' ? stegaClean(src.alt) : undefined
}

function lqipFrom(src: ImageSource): string | undefined {
  if (typeof src !== 'object' || src === null) return
  // An image object keeps its metadata on `asset`, an asset document keeps it on the root.
  const holder: unknown = 'asset' in src ? src.asset : src
  if (typeof holder !== 'object' || holder === null || !('metadata' in holder)) return
  const metadata = holder.metadata
  if (typeof metadata !== 'object' || metadata === null || !('lqip' in metadata)) return
  const lqip = metadata.lqip
  return typeof lqip === 'string' && lqip !== '' ? stegaClean(lqip) : undefined
}

/**
 * Draws the preview through an SVG Gaussian blur, so the tiny LQIP doesn't
 * render as visible blocks when scaled up.
 */
function blurPlaceholderStyle(
  blurDataURL: string,
  objectFit: CSSProperties['objectFit'],
): CSSProperties {
  const preserveAspectRatio = objectFit === 'contain' ? 'xMidYMid' : 'xMidYMid slice'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='20'/><feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/><feFlood x='0' y='0' width='100%' height='100%'/><feComposite operator='out' in='s'/><feComposite in2='SourceGraphic'/><feGaussianBlur stdDeviation='20'/></filter><image width='100%' height='100%' x='0' y='0' preserveAspectRatio='${preserveAspectRatio}' style='filter: url(#b);' href='${blurDataURL}'/></svg>`
  return {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,${svg.replace(/[%#<>"]/g, encodeURIComponent)}")`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  }
}
