import {type ClientPerspective} from '@sanity/client'
import {isMaybePresentation} from '@sanity/presentation-comlink'
import {
  enableVisualEditing,
  type HistoryRefresh,
  type OverlayComponentResolver,
} from '@sanity/visual-editing'
import {type ReactNode, useEffect, useState} from 'react'
import {useRevalidator, useSubmit} from 'react-router'
import {useEffectEvent} from 'use-effect-event'

import {isServer, sanitizePerspective} from '../utils'
import {useHistory} from './hooks/history'
import {useRefresh} from './hooks/refresh'
import {useHasActiveLoaders} from './registry'
import type {Revalidator} from './types'

export interface OverlaysProps {
  /**
   * Custom overlay components for visual editing.
   */
  components?: OverlayComponentResolver
  /**
   * The CSS z-index for visual editing overlays.
   */
  zIndex?: string | number
  /**
   * Custom refresh logic. Called when content changes.
   */
  refresh?: (
    payload: HistoryRefresh,
    refreshDefault: () => false | Promise<void>,
    revalidator: Revalidator,
  ) => false | Promise<void>
  /**
   * The action URL path used to submit perspective changes.
   */
  action?: string
}

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
  throw new Error(
    'Overlays should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables visual editing overlays and click-to-edit functionality.
 *
 * This component handles:
 * - Visual overlays for click-to-edit
 * - Element highlighting and interactions
 * - Perspective changes from Studio
 * - Server revalidation for content changes
 *
 * For real-time data synchronization with Studio, also use LiveMode component.
 *
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
function OverlaysClient(props: OverlaysProps): ReactNode {
  const {components, zIndex, refresh, action = '/api/preview'} = props

  const submit = useSubmit()
  const revalidator = useRevalidator()
  const {refreshHandler} = useRefresh()
  const refreshFn = refreshHandler(refresh)
  const historyAdapter = useHistory()
  const hasActiveLoaders = useHasActiveLoaders()

  // Detect if we're in a Studio presentation context (lazy initialization for SSR safety)
  const [inStudioContext] = useState<boolean | null>(() => {
    // Only run on client-side to avoid SSR mismatch
    if (isServer()) {
      return null
    }

    return isMaybePresentation()
  })

  // Handle perspective changes from Studio
  const handlePerspectiveChange = useEffectEvent((perspective: ClientPerspective) => {
    // Sanitize perspective (filters out undefined/empty values from upstream bug)
    const cleanPerspective = sanitizePerspective(perspective)

    const formData = new FormData()
    formData.set(
      'perspective',
      Array.isArray(cleanPerspective) ? cleanPerspective.join(',') : cleanPerspective,
    )
    submit(formData, {
      method: 'PUT',
      action,
      navigate: false,
      preventScrollReset: true,
    })

    // Always trigger refresh for perspective changes (server revalidation needed)
    refreshFn({
      source: 'manual',
      livePreviewEnabled: false, // Force server revalidation for perspective changes
    } as const)
  })

  const handleRefresh = useEffectEvent((payload: HistoryRefresh): false | Promise<void> => {
    // Prioritize userland refresh function if provided
    if (refresh) {
      return refresh(payload, () => refreshFn(payload), revalidator)
    }

    switch (payload.source) {
      case 'manual':
        // Always handle manual refresh events (like perspective changes)
        return refreshFn(payload)

      default:
        // For other refresh events, check if active loaders should handle them
        if (hasActiveLoaders) {
          return false // Let client loaders handle mutations (live mode active)
        }
        return refreshFn(payload) // Server revalidation for server-only setups
    }
  })

  // Listen for presentation events from Studio (only perspective changes needed for server revalidation)
  useEffect(() => {
    if (isServer() || !inStudioContext) return undefined

    const handleMessage = (event: MessageEvent) => {
      const {type, data} = event.data || {}

      // Only handle perspective changes - let enableVisualEditing handle refresh events
      if (type === 'presentation/perspective') {
        handlePerspectiveChange(data.perspective)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [inStudioContext])

  // Enable visual editing overlays and interactions
  useEffect(() => {
    const disable = enableVisualEditing({
      components,
      zIndex,
      refresh: handleRefresh,
      history: historyAdapter,
    })

    return () => disable()
  }, [components, zIndex, historyAdapter])

  return null
}

export default OverlaysClient
