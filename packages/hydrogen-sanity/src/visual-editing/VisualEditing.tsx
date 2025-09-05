import {lazy, type ReactElement, Suspense} from 'react'

import {isServer} from '../utils'
import type {VisualEditingProps} from './VisualEditing.client'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function VisualEditingFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const VisualEditingComponent = isServer()
  ? VisualEditingFallback
  : lazy(
      () =>
        /**
         * `lazy` expects the component as the default export
         * @see https://react.dev/reference/react/lazy
         */
        import('./VisualEditing.client'),
    )

/**
 * Combined visual editing component with overlays and optional live mode.
 *
 * Provides click-to-edit overlays by default. Enable `liveMode` for real-time
 * data synchronization when using client-side loaders like `useQuery`.
 *
 * @param props.liveMode - Enable live data sync (default: false)
 * @param props.components - Custom overlay components
 * @param props.zIndex - CSS z-index for overlays
 * @param props.refresh - Custom refresh logic
 * @param props.onConnect - Studio connection callback
 * @param props.onDisconnect - Studio disconnection callback
 *
 * @example
 * ```tsx
 * // Server-only (overlays only)
 * <VisualEditing />
 *
 * // With live data sync
 * <VisualEditing liveMode={true} />
 * ```
 */
export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense fallback={<VisualEditingFallback />}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
