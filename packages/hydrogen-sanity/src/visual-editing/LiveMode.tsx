import {lazy, type ReactElement, Suspense} from 'react'

import {isServer} from '../utils'
import type {LiveModeProps} from './LiveMode.client'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function LiveModeFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const LiveModeComponent = isServer()
  ? LiveModeFallback
  : lazy(
      () =>
        /**
         * `lazy` expects the component as the default export
         * @see https://react.dev/reference/react/lazy
         */
        import('./LiveMode.client'),
    )

/**
 * Live data synchronization component for real-time Studio updates.
 *
 * Enables real-time data updates and perspective changes between Sanity Studio
 * and your application. Only use when you have client-side loaders (`useQuery`).
 *
 * @param props.action - URL path for perspective change submissions
 * @param props.onConnect - Callback when Studio connection established
 * @param props.onDisconnect - Callback when Studio connection lost
 * @param props.filter - Stega filter for content encoding
 * @param props.studioUrl - Studio URL for stega configuration
 *
 * @example
 * ```tsx
 * // Basic live mode
 * <LiveMode />
 *
 * // With callbacks and custom action
 * <LiveMode
 *   action="/api/preview"
 *   onConnect={() => console.log('Connected')}
 *   onDisconnect={() => console.log('Disconnected')}
 * />
 * ```
 */
export function LiveMode(props: LiveModeProps): ReactElement {
  return (
    <Suspense fallback={<LiveModeFallback />}>
      <LiveModeComponent {...props} />
    </Suspense>
  )
}
