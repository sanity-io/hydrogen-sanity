/**
 * @vitest-environment jsdom
 */
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
