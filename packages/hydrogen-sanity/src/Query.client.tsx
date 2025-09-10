import type {Any, ClientReturn, QueryParams, QueryWithoutParams} from '@sanity/client'
import type {EncodeDataAttributeFunction} from '@sanity/core-loader/encode-data-attribute'
import type {UseQueryOptionsDefinedInitial} from '@sanity/react-loader'
import {useQuery} from '@sanity/react-loader'
import type {ReactNode} from 'react'

import type {LoadQueryOptions} from './context'
import {isServer} from './utils'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
  throw new Error(
    '`QueryClient` should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

export interface QueryClientProps<Result = Any, Query extends string = string> {
  query: Query
  params?: QueryParams | QueryWithoutParams
  options: UseQueryOptionsDefinedInitial<ClientReturn<Query, Result>> &
    LoadQueryOptions<ClientReturn<Query, Result>>
  children: (
    data: ClientReturn<Query, Result>,
    encodeDataAttribute: EncodeDataAttributeFunction,
  ) => ReactNode
}

/**
 * Client-side query component that provides live updates via useQuery.
 *
 * Lazy loaded only when preview mode is enabled to avoid bundle bloat.
 * Handles loading states and provides initial data fallback during query updates.
 */
function QueryClient<Result = Any, Query extends string = string>({
  query,
  params,
  options,
  children,
}: QueryClientProps<Result, Query>): ReactNode {
  const {data, error, loading, encodeDataAttribute} = useQuery<ClientReturn<Query, Result>>(
    query,
    params,
    options,
  )

  if (error) {
    throw error
  }

  // During loading, show initial server data to prevent flash of missing content
  if (loading) {
    const initialData =
      options.initial && typeof options.initial === 'object' && 'data' in options.initial
        ? options.initial.data
        : options.initial
    return children(initialData, encodeDataAttribute)
  }

  return children(data, encodeDataAttribute)
}

export default QueryClient
