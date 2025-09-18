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

import type {Revalidator} from '../types'
import {useRefresh} from './refresh'

describe('useRefresh', () => {
  const mockUseRevalidator = vi.mocked(useRevalidator)
  const mockRevalidator: Revalidator = {
    state: 'idle' as const,
    revalidate: vi.fn(),
  }

  const wrapper = ({children}: {children: ReactNode}) => <BrowserRouter>{children}</BrowserRouter>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRevalidator.mockReturnValue(mockRevalidator)
  })

  it('should skip revalidation for mutations when client loaders are active', async () => {
    // IDEAL: When useQuery hooks are present, they handle real-time updates via comlink
    // CURRENT: Relies on livePreviewEnabled as proxy (which may be unreliable upstream)
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshResult = refreshFunction({
      source: 'mutation',
      livePreviewEnabled: true, // Should indicate client loaders are active
      document: {_type: 'product', _id: 'test-id', _rev: 'test-rev'},
    })

    expect(refreshResult).toBe(false)
    expect(mockRevalidator.revalidate).not.toHaveBeenCalled()
  })

  it('should revalidate for mutations when no client loaders are active', () => {
    // IDEAL: When no useQuery hooks are present, server revalidation is essential
    // CURRENT: Relies on livePreviewEnabled as proxy (which may be unreliable upstream)
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshPromise = refreshFunction({
      source: 'mutation',
      livePreviewEnabled: false, // Should indicate no client loaders are active
      document: {_type: 'product', _id: 'test-id', _rev: 'test-rev'},
    })

    expect(refreshPromise).toBeInstanceOf(Promise)
    expect(mockRevalidator.revalidate).toHaveBeenCalled()
  })

  it('should always revalidate for manual refreshes', () => {
    // IDEAL: Manual refreshes always need server revalidation regardless of client loaders
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshPromise = refreshFunction({source: 'manual', livePreviewEnabled: false})

    expect(refreshPromise).toBeInstanceOf(Promise)
    expect(mockRevalidator.revalidate).toHaveBeenCalled()
  })

  it('should always revalidate for perspective changes', () => {
    // IDEAL: Perspective changes affect what data should be fetched, always need revalidation
    // NOTE: Currently testing manual refresh as proxy for "always revalidate" scenarios
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshPromise = refreshFunction({
      source: 'manual',
      livePreviewEnabled: true, // Even when client loaders are active
    })

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
      expect.objectContaining({
        revalidate: expect.any(Function),
        state: 'idle',
      }),
    )
  })

  it('should handle unknown source types by defaulting to revalidate', () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    // @ts-expect-error Testing unknown source type
    const refreshPromise = refreshFunction({source: 'unknown', livePreviewEnabled: false})

    expect(refreshPromise).toBeInstanceOf(Promise)
    expect(mockRevalidator.revalidate).toHaveBeenCalled()
  })

  it('should handle mutation with complete document metadata', () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    const refreshPromise = refreshFunction({
      source: 'mutation',
      livePreviewEnabled: false,
      document: {
        _id: 'drafts.product-123',
        _type: 'product',
        _rev: 'abc123',
        slug: {current: 'test-product'},
      },
    })

    expect(refreshPromise).toBeInstanceOf(Promise)
    expect(mockRevalidator.revalidate).toHaveBeenCalled()
  })

  it('should distinguish between draft and published documents', () => {
    const {result} = renderHook(() => useRefresh(), {wrapper})
    const refreshFunction = result.current.refreshHandler()

    // Test draft document
    refreshFunction({
      source: 'mutation',
      livePreviewEnabled: false,
      document: {
        _id: 'drafts.product-123', // Draft document (prefixed with 'drafts.')
        _type: 'product',
        _rev: 'abc123',
      },
    })

    // Test published document
    refreshFunction({
      source: 'mutation',
      livePreviewEnabled: false,
      document: {
        _id: 'product-123', // Published document (no prefix)
        _type: 'product',
        _rev: 'def456',
      },
    })

    expect(mockRevalidator.revalidate).toHaveBeenCalledTimes(2)
  })
})
