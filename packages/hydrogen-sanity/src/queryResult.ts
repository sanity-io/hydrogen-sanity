import type {QueryResponseInitial} from '@sanity/react-loader'

/**
 * Whether a `context.sanity.query` result is the preview mode shape
 * (`{data, sourceMap, perspective}`), rather than the query result itself. Use it to read the
 * result in a loader, for example to return a 404.
 *
 * @example
 * ```ts
 * const initial = await context.sanity.query(PAGE_QUERY, {slug: params.slug})
 * const page = isQueryResponseInitial(initial) ? initial.data : initial
 * if (!page) throw new Response('Not found', {status: 404})
 * ```
 *
 * @public
 */
export function isQueryResponseInitial<T>(
  value: T | QueryResponseInitial<T>,
): value is QueryResponseInitial<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'sourceMap' in value &&
    'perspective' in value
  )
}
