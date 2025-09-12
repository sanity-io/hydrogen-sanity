/**
 * @vitest-environment jsdom
 */
import {act, renderHook, waitFor} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {registerQuery, useHasActiveLoaders} from './registry'

// Clean up any leftover queries between tests
function clearAllQueries() {
  // Reset the sets by clearing them through multiple register/unregister cycles
  const cleanup: Array<() => void> = []
  // Register and immediately unregister to force cleanup of any leftover state
  for (let i = 0; i < 10; i++) {
    const unregister = registerQuery(`cleanup-${i}`)
    cleanup.push(unregister)
  }
  cleanup.forEach((fn) => fn())
}

describe('registry', () => {
  afterEach(() => {
    clearAllQueries()
  })

  it('should initially have no active queries', async () => {
    clearAllQueries()
    const {result} = renderHook(() => useHasActiveLoaders())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should detect when a query is registered', async () => {
    clearAllQueries()
    const {result} = renderHook(() => useHasActiveLoaders())
    let unregister: (() => void) | undefined

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    act(() => {
      unregister = registerQuery('test-query-1')
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    // Clean up
    act(() => {
      unregister?.()
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should detect multiple queries', async () => {
    clearAllQueries()
    const {result} = renderHook(() => useHasActiveLoaders())
    let unregister1: (() => void) | undefined
    let unregister2: (() => void) | undefined

    act(() => {
      unregister1 = registerQuery('test-query-1')
      unregister2 = registerQuery('test-query-2')
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    // Remove one query, should still be true
    act(() => {
      unregister1?.()
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    // Remove second query, should be false
    act(() => {
      unregister2?.()
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should handle unregistering queries properly', async () => {
    clearAllQueries()
    const {result} = renderHook(() => useHasActiveLoaders())
    let unregister: (() => void) | undefined

    act(() => {
      unregister = registerQuery('test-query')
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

    act(() => {
      unregister?.()
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should handle multiple hook subscribers', async () => {
    clearAllQueries()
    const {result: result1} = renderHook(() => useHasActiveLoaders())
    const {result: result2} = renderHook(() => useHasActiveLoaders())
    let unregister: (() => void) | undefined

    await waitFor(() => {
      expect(result1.current).toBe(false)
      expect(result2.current).toBe(false)
    })

    act(() => {
      unregister = registerQuery('test-query')
    })

    await waitFor(() => {
      expect(result1.current).toBe(true)
      expect(result2.current).toBe(true)
    })

    act(() => {
      unregister?.()
    })

    await waitFor(() => {
      expect(result1.current).toBe(false)
      expect(result2.current).toBe(false)
    })
  })
})
