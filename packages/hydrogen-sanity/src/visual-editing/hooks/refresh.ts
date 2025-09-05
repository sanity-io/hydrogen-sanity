import type {HistoryRefresh} from '@sanity/visual-editing'
import {useCallback, useState} from 'react'
import {useRevalidator} from 'react-router'

/**
 * Hook that provides refresh logic for visual editing.
 * Integrates with React Router's revalidator for optimal data refetching.
 */
export function useRefresh(): {
  refreshHandler: (
    customRefresh?: (
      payload: HistoryRefresh,
      refreshDefault: () => false | Promise<void>,
    ) => false | Promise<void>,
  ) => (payload: HistoryRefresh) => false | Promise<void>
  handleRevalidatorState: () => void
  revalidatorState: 'idle' | 'loading' | 'submitting'
} {
  const revalidator = useRevalidator()
  const [revalidatorPromise, setRevalidatorPromise] = useState<(() => void) | null>(null)
  const [revalidatorLoading, setRevalidatorLoading] = useState(false)

  const handleRevalidatorState = useCallback(() => {
    if (revalidatorPromise && revalidator.state === 'loading') {
      setRevalidatorLoading(true)
    } else if (revalidatorPromise && revalidatorLoading && revalidator.state === 'idle') {
      revalidatorPromise()
      setRevalidatorPromise(null)
      setRevalidatorLoading(false)
    }
  }, [revalidatorLoading, revalidator.state, revalidatorPromise])

  const createRefreshHandler = useCallback(
    (
      customRefresh?: (
        payload: HistoryRefresh,
        refreshDefault: () => false | Promise<void>,
      ) => false | Promise<void>,
    ) => {
      return (payload: HistoryRefresh) => {
        function refreshDefault() {
          // Skip revalidation if live preview is enabled (avoids wasteful server calls)
          if (payload.source === 'mutation' && payload.livePreviewEnabled) {
            return false
          }

          return new Promise<void>((resolve) => {
            revalidator.revalidate()
            setRevalidatorPromise(() => resolve)
          })
        }
        return customRefresh ? customRefresh(payload, refreshDefault) : refreshDefault()
      }
    },
    [revalidator],
  )

  return {
    refreshHandler: createRefreshHandler,
    handleRevalidatorState,
    revalidatorState: revalidator.state,
  }
}
