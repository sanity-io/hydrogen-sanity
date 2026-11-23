/**
 * @vitest-environment jsdom
 */
import type {HistoryRefresh} from '@sanity/visual-editing'
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, expect, it, vi} from 'vitest'

import OverlaysClient from './Overlays.client'

// Mock external dependencies
vi.mock('@sanity/visual-editing', () => ({
  enableVisualEditing: vi.fn(() => vi.fn()),
}))

vi.mock('@sanity/presentation-comlink', () => ({
  isMaybePresentation: vi.fn(() => false), // Default to standalone context in tests
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSubmit: vi.fn(),
    useRevalidator: vi.fn(() => ({
      state: 'idle',
      revalidate: vi.fn(),
    })),
  }
})

vi.mock('../provider', () => ({
  useSanityProviderValue: vi.fn(() => ({
    projectId: 'test-project',
    dataset: 'production',
    perspective: 'published',
    apiVersion: '2023-01-01',
    stegaEnabled: false,
  })),
}))

vi.mock('./hooks/refresh', () => ({
  useRefresh: vi.fn(() => ({
    refreshHandler: vi.fn(() => vi.fn()),
    handleRevalidatorState: vi.fn(),
    revalidatorState: 'idle',
  })),
}))

vi.mock('./hooks/history', () => ({
  useHistory: vi.fn(() => ({})),
}))

const {enableVisualEditing} = await import('@sanity/visual-editing')
const mockEnableVisualEditing = vi.mocked(enableVisualEditing)

beforeEach(() => {
  vi.clearAllMocks()
})

it('should enable visual editing overlays', () => {
  render(
    <BrowserRouter>
      <OverlaysClient />
    </BrowserRouter>,
  )

  expect(mockEnableVisualEditing).toHaveBeenCalled()
})

it('should pass components and zIndex to enableVisualEditing', () => {
  const components = vi.fn()

  render(
    <BrowserRouter>
      <OverlaysClient components={components} zIndex={999} />
    </BrowserRouter>,
  )

  expect(mockEnableVisualEditing).toHaveBeenCalledWith({
    components,
    zIndex: 999,
    refresh: expect.any(Function),
    history: expect.any(Object),
    keepStegaOnCopy: undefined,
    onSuspiciousStega: undefined,
  })
})

it('should pass keepStegaOnCopy and onSuspiciousStega to enableVisualEditing', () => {
  const onSuspiciousStega = vi.fn()

  render(
    <BrowserRouter>
      <OverlaysClient keepStegaOnCopy onSuspiciousStega={onSuspiciousStega} />
    </BrowserRouter>,
  )

  expect(mockEnableVisualEditing).toHaveBeenCalledWith({
    components: undefined,
    zIndex: undefined,
    refresh: expect.any(Function),
    history: expect.any(Object),
    keepStegaOnCopy: true,
    onSuspiciousStega: expect.any(Function),
  })
})

it('should return null (no visual output)', () => {
  const {container} = render(
    <BrowserRouter>
      <OverlaysClient />
    </BrowserRouter>,
  )

  expect(container.firstChild).toBeNull()
})

it('ignores an invalid perspective from Studio instead of throwing', async () => {
  const {isMaybePresentation} = await import('@sanity/presentation-comlink')
  vi.mocked(isMaybePresentation).mockReturnValue(true)
  const {useSubmit} = await import('react-router')
  const submit = vi.fn()
  vi.mocked(useSubmit).mockReturnValue(submit)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

  render(
    <BrowserRouter>
      <OverlaysClient />
    </BrowserRouter>,
  )
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {type: 'presentation/perspective', data: {perspective: [undefined]}},
    }),
  )

  expect(submit).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(
    'Ignoring an invalid perspective from Sanity Studio.',
    expect.any(TypeError),
  )

  warn.mockRestore()
  vi.mocked(isMaybePresentation).mockReturnValue(false)
})

it('calls a custom `refresh` once per event, with the plain default as `refreshDefault`', async () => {
  const {useRefresh} = await import('./hooks/refresh')
  const defaultRefresh = vi.fn((): false => false)
  // Mirror the real hook: a custom refresh passed to `refreshHandler` wraps the default
  vi.mocked(useRefresh).mockReturnValue({
    refreshHandler: (customRefresh) => (payload) =>
      customRefresh
        ? customRefresh(payload, defaultRefresh, {state: 'idle', revalidate: vi.fn()})
        : defaultRefresh(),
  })
  const refresh = vi.fn((_payload: HistoryRefresh, refreshDefault: () => false | Promise<void>) =>
    refreshDefault(),
  )

  render(
    <BrowserRouter>
      <OverlaysClient refresh={refresh} />
    </BrowserRouter>,
  )
  const options = mockEnableVisualEditing.mock.calls[0]?.[0]
  options?.refresh?.({
    source: 'mutation',
    livePreviewEnabled: false,
    document: {_type: 'product', _id: 'test-id', _rev: 'test-rev'},
  })

  expect(refresh).toHaveBeenCalledTimes(1)
  expect(defaultRefresh).toHaveBeenCalledTimes(1)
})
