'use client'
/**
 * Click-to-edit overlays and Presentation integration. The eager part is a tiny gate. The overlay
 * code loads only when `enabled` is true.
 *
 * @packageDocumentation
 */
import type {VisualEditingProps as UpstreamProps} from '@sanity/visual-editing/react-router'
import {lazy, Suspense, type JSX} from 'react'

/**
 * Sets the props of `<VisualEditing>`.
 *
 * @public
 */
export interface VisualEditingProps
  extends Omit<UpstreamProps, 'history' | 'onPerspectiveChange' | 'onVariantChange'> {
  /**
   * Enables overlays and the Presentation connection. Pass the preview state. When `false`, the
   * component renders nothing and loads no code.
   */
  enabled: boolean
  /**
   * Overrides the path of the preview resource route.
   *
   * @defaultValue the `previewRoute` of the root data, or `'/api/preview'`
   */
  action?: string
}

const VisualEditingClient = lazy(() => import('./client'))

/**
 * Renders click-to-edit overlays and connects the page to Presentation.
 *
 * The component syncs navigation with Presentation, refreshes loader data when content changes,
 * and sends perspective and variant changes to the preview route. Studio then does not reload
 * the iframe.
 *
 * @param props - The preview state and the overlay options.
 * @returns The overlays in preview, or nothing.
 * @example
 * ```tsx
 * // app/root.tsx
 * const preview = usePreview()
 * return <VisualEditing enabled={preview.enabled} />
 * ```
 * @public
 */
export function VisualEditing({enabled, ...props}: VisualEditingProps): JSX.Element | null {
  if (!enabled) return null
  return (
    <Suspense fallback={null}>
      <VisualEditingClient {...props} />
    </Suspense>
  )
}
