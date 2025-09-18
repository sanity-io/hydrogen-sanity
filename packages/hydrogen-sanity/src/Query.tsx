import type {Any, ClientReturn, QueryParams, QueryWithoutParams} from '@sanity/client'
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

const noopEncodeDataAttribute: EncodeDataAttributeFunction = Object.assign(() => undefined, {
  scope: () => noopEncodeDataAttribute,
})

export interface QueryProps<Result = Any, Query extends string = string>
  extends Omit<QueryClientProps<Result, Query>, 'options'> {
  query: Query
  params?: QueryParams | QueryWithoutParams
  options: {
    initial: ClientReturn<Query, Result> | QueryResponseInitial<ClientReturn<Query, Result>>
  } & LoadQueryOptions<ClientReturn<Query, Result>>
  children: (
    data: ClientReturn<Query, Result>,
    encodeDataAttribute: EncodeDataAttributeFunction,
  ) => ReactNode
}

/**
 * Query component that provides live updates in preview mode and static data otherwise.
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
  return children(options.initial as ClientReturn<Query, Result>, noopEncodeDataAttribute)
}
