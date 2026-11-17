import type {StegaBranded, StegaCleaned} from '@sanity/client/stega'
import type {
  InferImageValue as ImageUrlInferImageValue,
  InferStrictImageValue as ImageUrlInferStrictImageValue,
} from '@sanity/image-url'

/**
 * Widens a query result type to cover both sides of stega branding: the clean
 * TypeGen shape and the stega-branded shape returned while previewing.
 */
type StegaAware<T> = StegaCleaned<T> | StegaBranded<T>

/**
 * Collects every image shape found anywhere in `T`, which can be a TypeGen
 * query result, a union of query results, or a schema type. File fields are
 * skipped. `null` and `undefined` are dropped.
 *
 * Stega-aware version of `InferImageValue` from `@sanity/image-url`: the
 * inferred image type accepts both clean query results and stega-branded
 * results. Don't `stegaClean()` the image before passing it to `<Image>`;
 * the component strips stega from the asset id and URL itself.
 *
 * @example
 * ```ts
 * import type {InferImageValue} from 'hydrogen-sanity'
 * import type {HOMEPAGE_QUERY_RESULT} from 'sanity.generated'
 *
 * type ImageValue = InferImageValue<HOMEPAGE_QUERY_RESULT>
 * ```
 */
export type InferImageValue<T> = ImageUrlInferImageValue<StegaAware<T>>

/**
 * Same as {@link InferImageValue}, but only the variants that have an asset,
 * which is what `isImageWithAsset` narrows to.
 */
export type InferStrictImageValue<T> = ImageUrlInferStrictImageValue<StegaAware<T>>
