'use client'
import type {ClientPerspective} from '@sanity/client'
import {VisualEditing as UpstreamVisualEditing} from '@sanity/visual-editing/react-router'
import {useCallback, useRef, type JSX} from 'react'
import {useFetcher} from 'react-router'

import {useSanityRootData} from '../preview/index'
import type {VisualEditingProps} from './index'

/**
 * Serializes a perspective for the preview route form. An array becomes JSON.
 *
 * @internal
 */
export function serializePerspective(perspective: ClientPerspective): string {
  return typeof perspective === 'string' ? perspective : JSON.stringify(perspective)
}

function samePerspective(a: ClientPerspective | undefined, b: ClientPerspective): boolean {
  return a !== undefined && serializePerspective(a) === serializePerspective(b)
}

/**
 * Loads only in preview. Wraps the upstream React Router adapter and sends perspective and
 * variant changes to the preview route.
 *
 * @internal
 */
export default function VisualEditingClient({
  action,
  ...props
}: Omit<VisualEditingProps, 'enabled'>): JSX.Element | null {
  const root = useSanityRootData()
  const fetcher = useFetcher()
  const route = action ?? root?.previewRoute ?? '/api/preview'

  // Keep the latest values in refs, so the callbacks stay stable across renders.
  const state = useRef({root, submit: fetcher.submit, route})
  state.current = {root, submit: fetcher.submit, route}

  const onPerspectiveChange = useCallback((perspective: ClientPerspective) => {
    const {root: current, submit, route: path} = state.current
    // Presentation reports the perspective on connect. Skip the round trip when nothing changed.
    if (samePerspective(current?.preview.perspective, perspective)) return
    void submit({perspective: serializePerspective(perspective)}, {method: 'PUT', action: path})
  }, [])

  const onVariantChange = useCallback((variant: string | undefined) => {
    const {root: current, submit, route: path} = state.current
    if ((current?.preview.variant ?? undefined) === variant) return
    void submit({variant: variant ?? ''}, {method: 'PUT', action: path})
  }, [])

  return (
    <UpstreamVisualEditing
      {...props}
      onPerspectiveChange={onPerspectiveChange}
      onVariantChange={onVariantChange}
    />
  )
}
