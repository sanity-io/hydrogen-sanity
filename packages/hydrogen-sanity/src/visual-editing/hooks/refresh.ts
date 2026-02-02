import type {HistoryRefresh} from '@sanity/visual-editing'
import {startTransition, useCallback, useEffect, useState} from 'react'
import {useRevalidator} from 'react-router'
import {useEffectEvent} from 'use-effect-event'

import type {Revalidator} from '../types'

/**
 * Hook that provides refresh logic for visual editing.
 * Integrates with React Router's revalidator for optimal data refetching.
 */
export function useRefresh(): {
  refreshHandler: (
    customRefresh?: (
      payload: HistoryRefresh,
      refreshDefault: () => false | Promise<void>,
      revalidator: Revalidator,
    ) => false | Promise<void>,
  ) => (payload: HistoryRefresh) => false | Promise<void>
} {
  const revalidator = useRevalidator()
  const [revalidatorPromise, setRevalidatorPromise] = useState<(() => void) | null>(null)
  const [revalidatorLoading, setRevalidatorLoading] = useState(false)

  // Handle revalidator state transitions internally
  const handleRevalidatorState = useEffectEvent(() => {
    if (revalidatorPromise && revalidator.state === 'loading') {
      startTransition(() => setRevalidatorLoading(true))
    } else if (revalidatorPromise && revalidatorLoading && revalidator.state === 'idle') {
      revalidatorPromise()
      startTransition(() => {
        setRevalidatorPromise(null)
        setRevalidatorLoading(false)
      })
    }
  })

  // Automatically handle revalidator state changes
  useEffect(() => {
    handleRevalidatorState()
  }, [revalidator.state])

  const createRefreshHandler = useCallback(
    (
      customRefresh?: (
        payload: HistoryRefresh,
        refreshDefault: () => false | Promise<void>,
        revalidator: Revalidator,
      ) => false | Promise<void>,
    ) => {
      return (payload: HistoryRefresh) => {
        function refreshDefault() {
          // Only skip revalidation for mutations when client loaders are active
          if (payload.source === 'mutation' && payload.livePreviewEnabled) {
            // Client loaders (useQuery) will handle the update via comlink
            return false
          }

          // All other cases: revalidate
          // - Manual refreshes (user explicitly requested refresh)
          // - Mutations without client loaders (server-only setup needs revalidation)
          // - Unknown source types (fallback to revalidate for safety)
          return new Promise<void>((resolve) => {
            revalidator.revalidate()
            setRevalidatorPromise(() => resolve)
          })
        }

        return customRefresh
          ? customRefresh(payload, refreshDefault, revalidator)
          : refreshDefault()
      }
    },
    [revalidator],
  )

  return {
    refreshHandler: createRefreshHandler,
  }
}
