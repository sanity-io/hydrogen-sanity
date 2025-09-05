/**
 * @vitest-environment jsdom
 */
import {renderHook} from '@testing-library/react'
import type {ReactNode} from 'react'
import {BrowserRouter} from 'react-router'
import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useRevalidator: vi.fn(),
  }
})

import {useRevalidator} from 'react-router'

import {useRefresh} from './refresh'

describe('useRefresh', () => {
  const mockUseRevalidator = vi.mocked(useRevalidator)
  const mockRevalidator = {
    state: 'idle' as const,
    revalidate: vi.fn(),
  }

  const wrapper = ({children}: {children: ReactNode}) => <BrowserRouter>{children}</BrowserRouter>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRevalidator.mockReturnValue(mockRevalidator)
  })

  it('should skip revalidation for live preview mutations', async () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshResult = await refreshFunction({
      source: 'mutation',
      livePreviewEnabled: true,
      document: {_type: 'product', _id: 'test-id', _rev: 'test-rev'},
    })

    expect(refreshResult).toBe(false)
    expect(mockRevalidator.revalidate).not.toHaveBeenCalled()
  })

  it('should allow revalidation for non-live preview changes', () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshPromise = refreshFunction({source: 'manual', livePreviewEnabled: false})

    expect(refreshPromise).toBeInstanceOf(Promise)
    expect(mockRevalidator.revalidate).toHaveBeenCalled()
  })

  it('should work with custom refresh function', async () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const customRefresh = vi.fn().mockResolvedValue(undefined)
    const refreshFunction = result.current.refreshHandler(customRefresh)

    await refreshFunction({source: 'manual', livePreviewEnabled: false})

    expect(customRefresh).toHaveBeenCalledWith(
      {source: 'manual', livePreviewEnabled: false},
      expect.any(Function),
    )
  })
})
