export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Sanity encodes the original dimensions of every image asset into its
 * filename, e.g. `…/Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000.jpg`. The CDN also
 * accepts a vanity filename after it (`…-2000x3000.jpg/my-photo.jpg`), so the
 * match may be followed by one more path segment, which is ignored.
 */
const FILENAME_DIMENSIONS = /-(\d+)x(\d+)\.\w+(?:\/[^/]+)?$/

function parsePositiveInt(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * The dimensions of the image a Sanity CDN URL points at: the `rect` crop
 * region when present (what the CDN will actually serve), otherwise the
 * original dimensions encoded in the asset filename.
 */
function servedDimensionsOf(srcUrl: URL): ImageDimensions | undefined {
  const rect = srcUrl.searchParams.get('rect')?.split(',')
  if (rect?.length === 4) {
    const width = parsePositiveInt(rect[2])
    const height = parsePositiveInt(rect[3])
    if (width && height) return {width, height}
  }
  const filename = FILENAME_DIMENSIONS.exec(srcUrl.pathname)
  if (filename) {
    const width = parsePositiveInt(filename[1])
    const height = parsePositiveInt(filename[2])
    if (width && height) return {width, height}
  }
  return undefined
}

/**
 * Resolves the intrinsic dimensions of an image from its CDN URL, in order of
 * precedence:
 *
 * 1. The `w` and `h` params (e.g. from an `@sanity/image-url` builder).
 * 2. One of `w` or `h`, with the other derived from the aspect ratio below.
 * 3. The `rect` crop region, otherwise the original dimensions Sanity encodes
 *    in the asset filename.
 */
export function resolveImageDimensions(srcUrl: URL): ImageDimensions | undefined {
  const width = parsePositiveInt(srcUrl.searchParams.get('w'))
  const height = parsePositiveInt(srcUrl.searchParams.get('h'))
  if (width !== undefined && height !== undefined) {
    return {width, height}
  }
  const served = servedDimensionsOf(srcUrl)
  if (!served) return undefined
  if (width !== undefined) {
    return {width, height: scale(width, served.width, served.height)}
  }
  if (height !== undefined) {
    return {width: scale(height, served.height, served.width), height}
  }
  return served
}

/**
 * Scales `known` from the `from` axis onto the `to` axis, clamped to 1px so
 * extreme aspect ratios never collapse the derived dimension to zero.
 */
function scale(known: number, from: number, to: number): number {
  return Math.max(1, Math.round((known / from) * to))
}
