import {useQuery as _useQuery, type UseQueryOptionsDefinedInitial} from '@sanity/react-loader'
import {useEffect, useId} from 'react'

import {registerQuery} from './registry'

/**
 * Automatically registers with the query detection system.
 * This enables automatic live mode detection in `VisualEditing` components.
 */
export function useQuery<QueryResponseResult = unknown>(
  query: string,
  params?: Record<string, unknown>,
  options?: UseQueryOptionsDefinedInitial<QueryResponseResult>,
): ReturnType<typeof _useQuery<QueryResponseResult>> {
  // Generate stable ID for this `useQuery` instance
  const id = useId()

  // Register this `useQuery` instance with the detection system
  useEffect(() => {
    const unregister = registerQuery(id)
    return unregister
  }, [id])

  // Call the original `useQuery` with all the same arguments
  return _useQuery<QueryResponseResult>(query, params, options)
}
