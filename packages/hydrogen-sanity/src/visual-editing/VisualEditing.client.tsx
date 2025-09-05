import type {StegaConfig} from '@sanity/client'
import type {HistoryRefresh, OverlayComponentResolver} from '@sanity/visual-editing'
import type {ReactNode} from 'react'

import {isServer} from '../utils'
import LiveMode from './LiveMode.client'
import Overlays from './Overlays.client'
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
  /**
   * Whether to enable live data synchronization with Studio.
   *
   * - `true`: Enable live mode (use when you have useQuery hooks)
   * - `false`: Overlays only (use for server-only setups)
   * - `undefined`: Auto-detect based on context (recommended)
   */
  liveMode?: boolean
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
 * Combined visual editing component that provides both overlays and optional live mode.
 *
 * **Server-only Usage** (default):
 * ```tsx
 * <VisualEditing />  // Overlays only with server revalidation
 * ```
 *
 * **With Live Data Sync** (opt-in when useQuery hooks are active):
 * ```tsx
 * <VisualEditing liveMode />  // Enable live mode for client loaders
 * ```
 *
 * **Individual Composition**:
 * ```tsx
 * <Overlays />
 * <LiveMode />  // Only when needed
 * ```
 *
 * Live mode is opt-in only to prevent Studio from incorrectly assuming
 * active client loaders when using server-only data patterns.
 *
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
export default function VisualEditing(props: VisualEditingProps): ReactNode {
  const {action, components, zIndex, refresh, onConnect, onDisconnect, liveMode, ...stegaProps} =
    props

  // Live mode is opt-in only to prevent Studio from assuming active client loaders
  const effectiveLiveMode = liveMode ?? false

  // Always render overlays for click-to-edit functionality
  const overlaysProps = {components, zIndex, refresh, action, liveMode: effectiveLiveMode}

  // Conditionally render live mode based on effective setting
  const liveModeProps = effectiveLiveMode ? {onConnect, onDisconnect, ...stegaProps} : undefined

  return (
    <>
      <Overlays {...overlaysProps} />
      {effectiveLiveMode && liveModeProps && <LiveMode {...liveModeProps} />}
    </>
  )
}
