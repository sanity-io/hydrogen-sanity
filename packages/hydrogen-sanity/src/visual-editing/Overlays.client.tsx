import {type ClientPerspective} from '@sanity/client'
import {isMaybePresentation} from '@sanity/presentation-comlink'
import {
  enableVisualEditing,
  type HistoryRefresh,
  type OverlayComponentResolver,
} from '@sanity/visual-editing'
import {type ReactNode, useEffect, useState} from 'react'
import {useSubmit} from 'react-router'
import {useEffectEvent} from 'use-effect-event'

import {isServer} from '../utils'
import {useHistory} from './hooks/history'
import {useRefresh} from './hooks/refresh'
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
  /**
   * Whether live mode is enabled (affects refresh behavior).
   */
  liveMode?: boolean
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
  const {components, zIndex, refresh, action, liveMode = false} = props

  const submit = useSubmit()
  const {refreshHandler} = useRefresh()
  const refreshFn = refreshHandler(refresh)
  const historyAdapter = useHistory()

  // Detect if we're in a Studio presentation context
  const [inStudioContext, setInStudioContext] = useState<boolean | null>(null)

  useEffect(() => {
    setInStudioContext(isMaybePresentation())
  }, [])

  // Handle perspective changes from Studio
  const handlePerspectiveChange = useEffectEvent((perspective: ClientPerspective) => {
    let finalAction = action
    if (!finalAction) {
      finalAction = '/api/preview'
    }

    const formData = new FormData()
    formData.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)
    submit(formData, {
      method: 'PUT',
      action: finalAction,
      navigate: false,
      preventScrollReset: true,
    })

    // Always trigger refresh for perspective changes (server revalidation needed)
    refreshFn({
      source: 'manual',
      livePreviewEnabled: false, // Force server revalidation for perspective changes
    } as const)
  })

  // Listen for presentation events from Studio (only perspective changes needed for server revalidation)
  useEffect(() => {
    if (typeof window === 'undefined' || !inStudioContext) return undefined

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
  }, [handlePerspectiveChange, inStudioContext])

  // Enable visual editing overlays and interactions
  useEffect(() => {
    const disable = enableVisualEditing({
      components,
      zIndex,
      refresh: (payload) => {
        // For server-only setups, always handle refresh events
        // For live mode setups, let the client loaders handle mutations
        if (!liveMode || payload.source === 'manual') {
          return refreshFn(payload)
        }
        return false
      },
      history: historyAdapter,
    })
    return () => disable()
  }, [components, zIndex, refreshFn, historyAdapter, liveMode])

  return null
}

export default OverlaysClient
