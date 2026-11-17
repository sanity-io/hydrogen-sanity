import type {ClientParams, ClientReturn} from '@sanity/client'
import {useQuery as _useQuery, type UseQueryOptionsDefinedInitial} from '@sanity/react-loader'
import {useEffect, useId} from 'react'

import {registerQuery} from './registry'

/**
 * `useQuery` has never resolved results through `SanityQueries`, so only a query carrying a
 * `__groqResult` brand changes the result type; any other query keeps `QueryResponseResult`.
 */
type UseQueryResult<Query extends string, QueryResponseResult> = [Query] extends [
  {readonly __groqResult?: unknown},
]
  ? ClientReturn<Query, QueryResponseResult>
  : QueryResponseResult

/**
 * Automatically registers with the query detection system.
 * This enables automatic live mode detection in `VisualEditing` components.
 */
export function useQuery<QueryResponseResult = unknown, Query extends string = string>(
  query: Query,
  params?: ClientParams<Query, Record<string, unknown>>,
  options?: UseQueryOptionsDefinedInitial<UseQueryResult<Query, QueryResponseResult>>,
): ReturnType<typeof _useQuery<UseQueryResult<Query, QueryResponseResult>>> {
  // Generate stable ID for this `useQuery` instance
  const id = useId()

  // Register this `useQuery` instance with the detection system
  useEffect(() => {
    const unregister = registerQuery(id)
    return unregister
  }, [id])

  // Call the original `useQuery` with all the same arguments
  return _useQuery<UseQueryResult<Query, QueryResponseResult>>(query, params, options)
}
