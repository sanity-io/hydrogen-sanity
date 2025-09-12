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
 * Combined visual editing component that provides both overlays and automatic live mode detection.
 *
 * **Default Usage** (automatic detection):
 * ```tsx
 * <VisualEditing />  // Automatically enables live mode when `Query` components or `useQuery` hooks are present
 * ```
 *
 * **Individual Composition** (advanced usage):
 * ```tsx
 * <Overlays />
 * <LiveMode />  // When you need fine-grained control
 * ```
 *
 * Live mode automatically activates when `Query` components or `useQuery` hooks are detected,
 * providing zero-configuration setup for most users while offering advanced control when needed.
 *
 * @param props.action - The action URL path used to submit perspective changes
 * @param props.components - Custom overlay components for visual editing
 * @param props.zIndex - The CSS z-index for visual editing overlays
 * @param props.refresh - Custom refresh logic. Called when content changes
 * @param props.onConnect - Fires when a connection is established to the Studio
 * @param props.onDisconnect - Fires when a connection to the Studio is lost
 *
 * @see https://www.sanity.io/docs/introduction-to-visual-editing
 */
export function VisualEditing(props: VisualEditingProps): ReactElement {
  return (
    <Suspense fallback={<VisualEditingFallback />}>
      <VisualEditingComponent {...props} />
    </Suspense>
  )
}
