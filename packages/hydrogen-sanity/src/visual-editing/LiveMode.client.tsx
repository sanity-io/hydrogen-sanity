import {createClient, type StegaConfig} from '@sanity/client'
import {useLiveMode} from '@sanity/react-loader'
import {type ReactNode, useMemo} from 'react'

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

  // Memoize stegaProps to maintain reference stability when content is unchanged
  // This prevents unnecessary client recreation when parent component re-renders
  const stableStegaProps = useMemo(
    () => stegaProps,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(stegaProps)],
  )

  const client = useMemo(() => {
    const baseClient = createClient({
      projectId: sanityProvider.projectId,
      dataset: sanityProvider.dataset,
      perspective: sanityProvider.perspective,
      apiVersion: sanityProvider.apiVersion,
      useCdn: false,
    })

    // Apply stega configuration if provided
    if (sanityProvider.stegaEnabled && Object.keys(stableStegaProps).length > 0) {
      return baseClient.withConfig({
        stega: {
          enabled: true,
          ...stableStegaProps,
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
    stableStegaProps,
  ])

  // Enable live mode for real-time data updates (client loaders only)
  useLiveMode({
    client,
    onConnect,
    onDisconnect,
  })

  // Initialize refresh hook to handle revalidator state transitions
  // The hook internally manages state changes via useEffect
  useRefresh()

  return null
}

export default LiveModeClient
