import {type ClientPerspective, createClient, type StegaConfig} from '@sanity/client'
import {useLiveMode} from '@sanity/react-loader'
import {
  enableVisualEditing,
  type HistoryRefresh,
  type OverlayComponentResolver,
} from '@sanity/visual-editing'
import {type ReactNode, useEffect, useMemo} from 'react'
import {useSubmit} from 'react-router'
import {useEffectEvent} from 'use-effect-event'

import {useSanityProviderValue} from '../provider'
import {isServer} from '../utils'
import {useHistory} from './hooks/history'
import {useRefresh} from './hooks/refresh'

export interface VisualEditingProps extends Omit<StegaConfig, 'enabled'> {
  /**
   * The action URL path used to submit perspective changes.
   */
  action?: string
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
  ) => false | Promise<void>
  /**
   * Fires when a connection is established to the Studio.
   */
  onConnect?: () => void
  /**
   * Fires when a connection to the Studio is lost.
   */
  onDisconnect?: () => void
}

let didWarnAboutNoAction = false

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
  throw new Error(
    'Visual editing should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables visual editing on the front-end
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
export default function VisualEditing(props: VisualEditingProps): ReactNode {
  // eslint-disable-next-line prefer-const
  let {action, components, zIndex, refresh, onConnect, onDisconnect, ...stegaProps} = props

  if (!action) {
    if (process.env.NODE_ENV === 'development' && !didWarnAboutNoAction) {
      console.warn(
        'No action URL provided for the visual editing component to set a new perspective. Defaulting to "/api/preview".',
      )
      didWarnAboutNoAction = true
    }
    action = '/api/preview'
  }

  const sanityProvider = useSanityProviderValue()
  const submit = useSubmit()

  const client = useMemo(() => {
    const baseClient = createClient({
      projectId: sanityProvider.projectId,
      dataset: sanityProvider.dataset,
      perspective: sanityProvider.perspective,
      apiVersion: sanityProvider.apiVersion,
      useCdn: false,
    })

    if (sanityProvider.stegaEnabled) {
      return baseClient.withConfig({
        stega: {
          enabled: true,
          ...stegaProps,
        },
      })
    }

    return baseClient
  }, [
    sanityProvider.projectId,
    sanityProvider.dataset,
    sanityProvider.perspective,
    sanityProvider.apiVersion,
    sanityProvider.stegaEnabled,
    stegaProps,
  ])

  const {refreshHandler, handleRevalidatorState} = useRefresh()
  const historyAdapter = useHistory()

  // Handle revalidator state changes
  useEffect(() => {
    handleRevalidatorState()
  })

  // Handle perspective changes
  const handlePerspectiveChange = useEffectEvent((perspective: ClientPerspective) => {
    const formData = new FormData()
    formData.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)
    submit(formData, {
      method: 'PUT',
      action,
      navigate: false,
      preventScrollReset: true,
    })
  })

  // Enable live mode for data updates
  useLiveMode({
    client,
    onPerspective: handlePerspectiveChange,
    onConnect,
    onDisconnect,
  })

  // Enable visual editing overlays and interactions
  useEffect(() => {
    const disable = enableVisualEditing({
      components,
      zIndex,
      refresh: refreshHandler(refresh),
      history: historyAdapter,
    })
    return () => disable()
  }, [components, zIndex, refresh, refreshHandler, historyAdapter])

  return null
}
