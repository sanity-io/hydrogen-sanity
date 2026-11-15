// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest'

import {provideOverlayNonce} from '../src/visual-editing/client'

describe('provideOverlayNonce', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  function addScript(nonce: string) {
    const script = document.createElement('script')
    script.nonce = nonce
    document.body.append(script)
  }

  it('copies the nonce of a React Router script into the meta tag that styled-components reads', () => {
    addScript('abc123')
    expect(provideOverlayNonce()).toBe('abc123')
    const meta = document.head.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
    expect(meta?.nonce).toBe('abc123')
    // The nonce lives in the property, not in a `content` attribute.
    expect(meta?.getAttribute('content')).toBeNull()
  })

  it('prefers an explicit nonce', () => {
    addScript('from-script')
    expect(provideOverlayNonce('explicit')).toBe('explicit')
  })

  it('keeps a meta tag that the app already rendered', () => {
    document.head.innerHTML = '<meta property="csp-nonce" content="from-app">'
    addScript('from-script')
    expect(provideOverlayNonce()).toBe('from-app')
    expect(document.head.querySelectorAll('meta[property="csp-nonce"]')).toHaveLength(1)
  })

  it('does nothing on a page without a nonce', () => {
    expect(provideOverlayNonce()).toBeUndefined()
    expect(document.head.querySelector('meta')).toBeNull()
  })
})
