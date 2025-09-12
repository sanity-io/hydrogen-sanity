import {createClient, type StegaConfig} from '@sanity/client'
import {useLiveMode} from '@sanity/react-loader'
import {type ReactNode, useEffect, useMemo} from 'react'

import {useSanityProviderValue} from '../provider'
import {isServer} from '../utils'
import {useRefresh} from './hooks/refresh'

export interface LiveModeProps extends Omit<StegaConfig, 'enabled'> {
  /**
   * Fires when a connection is established to the Studio.
   */
  onConnect?: () => void
  /**
   * Fires when a connection to the Studio is lost.
   */
  onDisconnect?: () => void
}

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
  throw new Error(
    'LiveMode should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Enables live data synchronization with Sanity Studio.
 *
 * This component handles:
 * - Real-time data updates via comlink connection to Studio
 * - Perspective changes (draft/published switching)
 * - Connection status with Studio
 *
 * Only use this component when you have client-side loaders (useQuery hooks)
 * that can receive real-time updates. For server-only setups, use only
 * Overlays component.
 *
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
function LiveModeClient(props: LiveModeProps): ReactNode {
  const {onConnect, onDisconnect, ...stegaProps} = props

  const sanityProvider = useSanityProviderValue()

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const client = useMemo(() => {
    const baseClient = createClient({
      projectId: sanityProvider.projectId,
      dataset: sanityProvider.dataset,
      perspective: sanityProvider.perspective,
      apiVersion: sanityProvider.apiVersion,
      useCdn: false,
    })

    // Apply stega configuration if provided
    if (sanityProvider.stegaEnabled && Object.keys(stegaProps).length > 0) {
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
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    stegaProps,
  ])

  // Enable live mode for real-time data updates (client loaders only)
  useLiveMode({
    client,
    onConnect,
    onDisconnect,
  })

  // Automatically handle revalidator state changes
  const {handleRevalidatorState} = useRefresh()
  useEffect(() => {
    handleRevalidatorState()
  })

  return null
}

export default LiveModeClient
