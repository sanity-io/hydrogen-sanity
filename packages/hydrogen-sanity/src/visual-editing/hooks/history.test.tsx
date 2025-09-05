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
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  }
})

import {useLocation, useNavigate} from 'react-router'

import {useHistory} from './history'

describe('useHistory', () => {
  const mockUseNavigate = vi.mocked(useNavigate)
  const mockUseLocation = vi.mocked(useLocation)
  const mockNavigate = vi.fn()
  const mockLocation = {
    pathname: '/test',
    search: '?param=value',
    hash: '#section',
    state: null,
    key: 'test-key',
  }

  const wrapper = ({children}: {children: ReactNode}) => <BrowserRouter>{children}</BrowserRouter>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockReturnValue(mockNavigate)
    mockUseLocation.mockReturnValue(mockLocation)
  })

  it('should handle navigation updates from visual editing', () => {
    const {result} = renderHook(() => useHistory(), {wrapper})

    result.current.update({type: 'push', url: '/new-path'})
    expect(mockNavigate).toHaveBeenCalledWith('/new-path', {replace: false})

    result.current.update({type: 'replace', url: '/replace-path'})
    expect(mockNavigate).toHaveBeenCalledWith('/replace-path', {replace: true})

    result.current.update({type: 'pop', url: '/ignored'})
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('should notify visual editing of location changes', () => {
    const {result, rerender} = renderHook(() => useHistory(), {wrapper})
    const mockNavigateCallback = vi.fn()

    result.current.subscribe(mockNavigateCallback)

    // Change location
    mockUseLocation.mockReturnValue({
      ...mockLocation,
      pathname: '/new-path',
    })

    rerender()

    expect(mockNavigateCallback).toHaveBeenCalledWith({
      type: 'push',
      url: '/new-path?param=value#section',
    })
  })

  it('should handle subscription cleanup', () => {
    const {result, rerender} = renderHook(() => useHistory(), {wrapper})
    const mockNavigateCallback = vi.fn()

    const unsubscribe = result.current.subscribe(mockNavigateCallback)
    unsubscribe()

    // Change location after unsubscribing
    mockUseLocation.mockReturnValue({
      ...mockLocation,
      pathname: '/after-unsubscribe',
    })

    rerender()

    expect(mockNavigateCallback).not.toHaveBeenCalled()
  })
})
