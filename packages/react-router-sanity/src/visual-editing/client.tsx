'use client'
import type {ClientPerspective} from '@sanity/client'
import {VisualEditing as UpstreamVisualEditing} from '@sanity/visual-editing/react-router'
import {useCallback, useEffect, useRef, useState, type JSX} from 'react'
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
 * Passes the page CSP nonce to the overlay styles.
 *
 * The overlays use styled-components, which reads its nonce from `<meta property="csp-nonce">`.
 * The function finds the nonce on a script tag (React Router renders it with
 * `<ServerRouter nonce>`) and writes the meta tag. The `nonce` property, not an attribute, holds
 * the value, so the nonce does not appear in the DOM.
 *
 * @param explicit - A nonce from the `nonce` prop. It overrides the detected nonce.
 * @returns The nonce that the overlays use, or `undefined` when the page has none.
 * @internal
 */
export function provideOverlayNonce(explicit?: string): string | undefined {
  const head = document.head
  const existing = head.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
  if (existing && !explicit) return existing.nonce || existing.getAttribute('content') || undefined
  const nonce = explicit ?? document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce
  if (!nonce) return undefined
  const meta = existing ?? document.createElement('meta')
  meta.setAttribute('property', 'csp-nonce')
  meta.nonce = nonce
  if (!existing) head.append(meta)
  return nonce
}

/**
 * Loads only in preview. Wraps the upstream React Router adapter and sends perspective and
 * variant changes to the preview route.
 *
 * @internal
 */
export default function VisualEditingClient({
  action,
  nonce,
  ...props
}: Omit<VisualEditingProps, 'enabled'>): JSX.Element | null {
  const root = useSanityRootData()
  const fetcher = useFetcher()
  const route = action ?? root?.previewRoute ?? '/api/preview'

  // Write the nonce meta tag before the overlays mount and inject their first style.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    provideOverlayNonce(nonce)
    setReady(true)
  }, [nonce])

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

  if (!ready) return null
  return (
    <UpstreamVisualEditing
      {...props}
      onPerspectiveChange={onPerspectiveChange}
      onVariantChange={onVariantChange}
    />
  )
}
