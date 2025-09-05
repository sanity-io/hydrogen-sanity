import {lazy, type ReactElement, Suspense} from 'react'

import {isServer} from '../utils'
import type {OverlaysProps} from './Overlays.client'

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function OverlaysFallback(): ReactElement {
  return <></>
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 */
const OverlaysComponent = isServer()
  ? OverlaysFallback
  : lazy(
      () =>
        /**
         * `lazy` expects the component as the default export
         * @see https://react.dev/reference/react/lazy
         */
        import('./Overlays.client'),
    )

/**
 * Visual editing overlays component for click-to-edit functionality.
 *
 * Provides interactive overlays that highlight content elements and enable
 * click-to-edit functionality. Does not include live data synchronization.
 *
 * @param props.components - Custom overlay components via OverlayComponentResolver
 * @param props.zIndex - CSS z-index for overlay positioning
 * @param props.refresh - Custom refresh logic for content changes
 *
 * @example
 * ```tsx
 * // Basic overlays
 * <Overlays />
 *
 * // With custom components
 * <Overlays components={customResolver} zIndex={1000} />
 * ```
 */
export function Overlays(props: OverlaysProps): ReactElement {
  return (
    <Suspense fallback={<OverlaysFallback />}>
      <OverlaysComponent {...props} />
    </Suspense>
  )
}
