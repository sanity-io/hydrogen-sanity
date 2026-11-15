'use client'
/**
 * Live content in the browser. The eager part is a tiny gate. The client and the event stream
 * load after hydration.
 *
 * @packageDocumentation
 */
import {lazy, Suspense, useSyncExternalStore, type JSX} from 'react'

/**
 * Sets the props of `<SanityLive>`.
 *
 * @public
 */
export interface SanityLiveProps {
  /**
   * Revalidates on draft changes in preview. Needs `preview.browserToken` in the middleware
   * config, because the browser needs a Viewer token to read draft events.
   *
   * @defaultValue `false`
   */
  includeDrafts?: boolean
  /** Receives connection errors. The component also logs a CORS error with the fix URL. */
  onError?: (error: unknown) => void
}

const SanityLiveClient = lazy(() => import('./client'))
const subscribe = () => () => {}

/**
 * Revalidates route data when published content on the page changes.
 *
 * The component subscribes to the Live Content API. It compares the tags of each event with the
 * `syncTags` that routes return from their loaders, and revalidates only on a match. In preview,
 * Presentation refresh events take over. Set `includeDrafts` to keep live drafts in preview.
 *
 * @param props - The draft mode and the error handler.
 * @returns Nothing visible.
 * @example
 * ```tsx
 * // app/root.tsx, inside <body>
 * <SanityLive />
 * ```
 * @public
 */
export function SanityLive(props: SanityLiveProps): JSX.Element | null {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  if (!hydrated) return null
  return (
    <Suspense fallback={null}>
      <SanityLiveClient {...props} />
    </Suspense>
  )
}
