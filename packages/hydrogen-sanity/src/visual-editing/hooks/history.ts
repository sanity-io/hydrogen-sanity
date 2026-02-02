import type {HistoryAdapter, HistoryAdapterNavigate, HistoryUpdate} from '@sanity/visual-editing'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useLocation, useNavigate} from 'react-router'

/**
 * Hook that provides history management for visual editing.
 * Integrates with React Router's navigation for Studio-storefront communication.
 */
export function useHistory(): HistoryAdapter {
  const navigateRemix = useNavigate()
  const navigateRemixRef = useRef(navigateRemix)
  const [navigate, setNavigate] = useState<HistoryAdapterNavigate | undefined>()
  const location = useLocation()
  // Track programmatic navigations to avoid duplicate notifications to Studio
  const isProgrammaticNavRef = useRef(false)

  useEffect(() => {
    navigateRemixRef.current = navigateRemix
  }, [navigateRemix])

  useEffect(() => {
    // Skip notification for programmatic navigations (initiated by Studio)
    // to avoid duplicate notifications and potential infinite loops
    if (navigate && !isProgrammaticNavRef.current) {
      navigate({
        type: 'push',
        url: `${location.pathname}${location.search}${location.hash}`,
      })
    }
    isProgrammaticNavRef.current = false
  }, [location.hash, location.pathname, location.search, navigate])

  const historyAdapter: HistoryAdapter = useMemo(
    () => ({
      subscribe(_navigate: HistoryAdapterNavigate) {
        setNavigate(() => _navigate)
        return () => setNavigate(undefined)
      },
      update(update: HistoryUpdate) {
        // Mark as programmatic navigation to skip notification in the location effect
        isProgrammaticNavRef.current = true
        if (update.type === 'push' || update.type === 'replace') {
          navigateRemixRef.current(update.url, {
            replace: update.type === 'replace',
          })
        } else if (update.type === 'pop') {
          navigateRemixRef.current(-1)
        }
      },
    }),
    [],
  )

  return historyAdapter
}
