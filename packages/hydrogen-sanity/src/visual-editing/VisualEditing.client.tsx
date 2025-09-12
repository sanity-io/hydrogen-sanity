import type {StegaConfig} from '@sanity/client'
import type {HistoryRefresh, OverlayComponentResolver} from '@sanity/visual-editing'
import type {ReactNode} from 'react'

import {isServer} from '../utils'
import LiveModeClient from './LiveMode.client'
import OverlaysClient from './Overlays.client'
import {useHasActiveLoaders} from './registry'
import type {Revalidator} from './types'

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
    revalidator: Revalidator,
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

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (isServer()) {
  throw new Error(
    'Visual editing should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

/**
 * Client-side visual editing component.
 * Automatically enables live mode when `Query` components or `useQuery` hooks are detected.
 */
function VisualEditingClient(props: VisualEditingProps): ReactNode {
  const {action, components, zIndex, refresh, onConnect, onDisconnect, ...stegaProps} = props

  // Get current loader detection state
  const hasActiveLoaders = useHasActiveLoaders()

  return (
    <>
      <OverlaysClient components={components} zIndex={zIndex} refresh={refresh} action={action} />
      {hasActiveLoaders && (
        <LiveModeClient onConnect={onConnect} onDisconnect={onDisconnect} {...stegaProps} />
      )}
    </>
  )
}

export default VisualEditingClient
