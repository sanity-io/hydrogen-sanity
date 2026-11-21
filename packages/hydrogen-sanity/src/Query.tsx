import type {Any, ClientParams, ClientReturn, QueryParams, QueryWithoutParams} from '@sanity/client'
import type {EncodeDataAttributeFunction} from '@sanity/core-loader/encode-data-attribute'
import type {QueryResponseInitial} from '@sanity/react-loader'
import {lazy, type ReactNode, Suspense, type SuspenseProps, useSyncExternalStore} from 'react'

import type {LoadQueryOptions} from './context'
import {usePreviewMode} from './preview/hooks'
import type {QueryClientProps} from './Query.client'
import {isServer} from './utils'

/**
 * Fallback component that renders nothing, preventing hydration mismatches.
 */
function SanityQueryFallback(): ReactNode {
  return null
}

/**
 * Simple hydration store to avoid hydration mismatches.
 * Returns false on server, true on client after hydration.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    // eslint-disable-next-line no-empty-function
    () => () => {},
    () => true,
    () => false,
  )
}

const QueryClient = isServer()
  ? SanityQueryFallback
  : (lazy(
      () =>
        /**
         * `lazy` expects the component as the default export
         * @see https://react.dev/reference/react/lazy
         */
        import('./Query.client'),
    ) as <Result = Any, Query extends string = string>(
      props: QueryClientProps<Result, Query>,
    ) => ReactNode)

/**
 * Whether `initial` is the `QueryResponseInitial` envelope (`{data, sourceMap, perspective}`)
 * that `query` and `loadQuery` return in preview mode, rather than the query result itself.
 */
function isQueryResponseInitial<T>(
  initial: T | QueryResponseInitial<T>,
  isPreviewMode: boolean,
): initial is QueryResponseInitial<T> {
  return isPreviewMode && initial !== null && typeof initial === 'object' && 'data' in initial
}

const noopEncodeDataAttribute: EncodeDataAttributeFunction = Object.assign(() => undefined, {
  scope: () => noopEncodeDataAttribute,
})

export interface QueryProps<Result = Any, Query extends string = string> extends Omit<
  QueryClientProps<Result, Query>,
  'options'
> {
  query: Query
  params?: ClientParams<Query, QueryParams | QueryWithoutParams>
  options: {
    initial: ClientReturn<Query, Result> | QueryResponseInitial<ClientReturn<Query, Result>>
  } & LoadQueryOptions<ClientReturn<Query, Result>>
  children: (
    data: ClientReturn<Query, Result>,
    encodeDataAttribute: EncodeDataAttributeFunction,
  ) => ReactNode
}

/**
 * Renders the result of `context.sanity.query`. Outside preview mode it renders `options.initial`
 * and loads no preview code. In preview mode it renders live updates from the Presentation tool
 * after hydration, and `encodeDataAttribute` returns `data-sanity` values for click-to-edit.
 *
 * @example
 * ```tsx
 * <Query query={PAGE_QUERY} options={{initial: loaderData.initial}}>
 *   {(page, encodeDataAttribute) => <h1 data-sanity={encodeDataAttribute('title')}>{page?.title}</h1>}
 * </Query>
 * ```
 *
 * @public
 */
export function Query<Result = Any, Query extends string = string>({
  query,
  params,
  options,
  children,
  ...suspenseProps
}: QueryProps<Result, Query> & Omit<SuspenseProps, 'children'>): ReactNode {
  const isPreviewMode = usePreviewMode()
  const isHydrated = useIsHydrated()

  // If in preview mode and hydrated, render the client component
  if (isPreviewMode && isHydrated) {
    return (
      <Suspense {...suspenseProps} fallback={suspenseProps.fallback ?? <SanityQueryFallback />}>
        <QueryClient<Result, Query>
          query={query}
          params={params}
          options={options as QueryClientProps<Result, Query>['options']}
        >
          {children}
        </QueryClient>
      </Suspense>
    )
  }

  // Render static data in non-preview mode or during hydration
  const {initial} = options
  return children(
    isQueryResponseInitial(initial, isPreviewMode) ? initial.data : initial,
    noopEncodeDataAttribute,
  )
}
