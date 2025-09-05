/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, expect, it, vi} from 'vitest'

import VisualEditing from './VisualEditing.client'

// Mock all external dependencies as simple functions
vi.mock('@sanity/react-loader', () => ({
  useLiveMode: vi.fn(),
}))

vi.mock('@sanity/visual-editing', () => ({
  enableVisualEditing: vi.fn(() => vi.fn()),
}))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../provider', () => ({
  useSanityProviderValue: vi.fn(() => ({
    projectId: 'test-project',
    dataset: 'test-dataset',
    apiVersion: '2023-01-01',
    perspective: 'published',
    stegaEnabled: true,
    preview: true,
    apiHost: 'https://api.sanity.io',
  })),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSubmit: vi.fn(),
  }
})

vi.mock('./hooks/refresh', () => ({
  useRefresh: vi.fn(() => ({
    refreshHandler: vi.fn(() => vi.fn()), // Returns a function when called
    handleRevalidatorState: vi.fn(),
    revalidatorState: 'idle',
  })),
}))

vi.mock('./hooks/history', () => ({
  useHistory: vi.fn(() => ({})),
}))

import {createClient} from '@sanity/client'
import {useLiveMode} from '@sanity/react-loader'
import {enableVisualEditing} from '@sanity/visual-editing'
import {useSubmit} from 'react-router'

const mockEnableVisualEditing = vi.mocked(enableVisualEditing)
const mockUseLiveMode = vi.mocked(useLiveMode)
const mockCreateClient = vi.mocked(createClient)
const mockUseSubmit = vi.mocked(useSubmit)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSubmit.mockReturnValue(vi.fn())
})

it('should export a React component', () => {
  expect(typeof VisualEditing).toBe('function')
})

it('should enable visual editing when rendered', () => {
  render(
    <BrowserRouter>
      <VisualEditing />
    </BrowserRouter>,
  )

  expect(mockEnableVisualEditing).toHaveBeenCalled()
})

it('should setup live mode when rendered', () => {
  render(
    <BrowserRouter>
      <VisualEditing />
    </BrowserRouter>,
  )

  expect(mockUseLiveMode).toHaveBeenCalled()
})

it('should create client with correct config', () => {
  render(
    <BrowserRouter>
      <VisualEditing />
    </BrowserRouter>,
  )

  expect(mockCreateClient).toHaveBeenCalledWith({
    projectId: 'test-project',
    dataset: 'test-dataset',
    perspective: 'published',
    apiVersion: '2023-01-01',
    useCdn: false,
  })
})

it('should configure stega when enabled', () => {
  const studioUrl = 'https://studio.test.com'
  const mockClient = {
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  } as any
  mockCreateClient.mockReturnValue(mockClient)

  render(
    <BrowserRouter>
      <VisualEditing filter={() => true} studioUrl={studioUrl} />
    </BrowserRouter>,
  )

  expect(mockClient.withConfig).toHaveBeenCalledWith({
    stega: {
      enabled: true,
      filter: expect.any(Function),
      studioUrl,
    },
  })
})

it('should handle perspective changes', () => {
  const mockSubmit = vi.fn()
  mockUseSubmit.mockReturnValue(mockSubmit)

  render(
    <BrowserRouter>
      <VisualEditing />
    </BrowserRouter>,
  )

  // Get the onPerspective callback passed to useLiveMode
  const useLiveModeCall = mockUseLiveMode.mock.calls[0]?.[0]
  const onPerspectiveHandler = useLiveModeCall?.onPerspective

  // Simulate perspective change from Studio
  onPerspectiveHandler?.('drafts')

  expect(mockSubmit).toHaveBeenCalled()
  const formData = mockSubmit.mock.calls[0][0]
  expect(formData.get('perspective')).toBe('drafts')
})

it('should return null (no visual output)', () => {
  const {container} = render(
    <BrowserRouter>
      <VisualEditing />
    </BrowserRouter>,
  )

  expect(container.firstChild).toBeNull()
})

it('should integrate useLiveMode with correct client for loader functionality', () => {
  render(
    <BrowserRouter>
      <VisualEditing onConnect={vi.fn()} onDisconnect={vi.fn()} />
    </BrowserRouter>,
  )

  // Verify useLiveMode is called with the proper client and lifecycle callbacks
  expect(mockUseLiveMode).toHaveBeenCalledWith({
    client: expect.any(Object),
    onPerspective: expect.any(Function),
    onConnect: expect.any(Function),
    onDisconnect: expect.any(Function),
  })
})

it('should integrate enableVisualEditing with history and refresh for comlink functionality', () => {
  render(
    <BrowserRouter>
      <VisualEditing zIndex={1000} />
    </BrowserRouter>,
  )

  // Verify enableVisualEditing is called with the correct configuration for Studio communication
  expect(mockEnableVisualEditing).toHaveBeenCalledWith({
    components: undefined,
    zIndex: 1000,
    refresh: expect.any(Function),
    history: expect.any(Object),
  })
})
