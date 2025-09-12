/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, expect, it, vi} from 'vitest'

import VisualEditingClient from './VisualEditing.client'

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

vi.mock('@sanity/presentation-comlink', () => ({
  isMaybePresentation: vi.fn(() => false), // Default to standalone context in tests
}))

vi.mock('../provider', () => ({
  useSanityProviderValue: vi.fn(() => ({
    projectId: 'test-project',
    dataset: 'test-dataset',
    apiVersion: '2023-01-01',
    perspective: 'published',
    stegaEnabled: true,
    previewEnabled: true,
    apiHost: 'https://api.sanity.io',
  })),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSubmit: vi.fn(),
    useRevalidator: vi.fn(() => ({
      revalidate: vi.fn(),
      state: 'idle',
    })),
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

import {createClient, type SanityClient} from '@sanity/client'
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
  expect(typeof VisualEditingClient).toBe('function')
})

it('should enable visual editing when rendered', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  expect(mockEnableVisualEditing).toHaveBeenCalled()
})

it('should setup live mode when liveMode is true', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient liveMode />
    </BrowserRouter>,
  )

  expect(mockUseLiveMode).toHaveBeenCalled()
})

it('should create client with correct config when liveMode is enabled', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient liveMode />
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

it('should configure stega when enabled and liveMode is true', () => {
  const studioUrl = 'https://studio.test.com'
  const mockClient = {
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  } as unknown as SanityClient
  mockCreateClient.mockReturnValue(mockClient)

  const handleFilter = vi.fn(() => true)
  render(
    <BrowserRouter>
      <VisualEditingClient liveMode filter={handleFilter} studioUrl={studioUrl} />
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

it('should not enable live mode by default', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  // With liveMode=false (default), LiveMode component should not be rendered
  expect(mockUseLiveMode).not.toHaveBeenCalled()
})

it('should enable live mode when liveMode is true', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient liveMode />
    </BrowserRouter>,
  )

  // With liveMode=true, LiveMode component should be rendered and useLiveMode called
  expect(mockUseLiveMode).toHaveBeenCalledWith({
    client: expect.any(Object),
    onConnect: undefined,
    onDisconnect: undefined,
  })
})

it('should return null (no visual output)', () => {
  const {container} = render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  expect(container.firstChild).toBeNull()
})

it('should integrate useLiveMode with correct client for loader functionality when liveMode is enabled', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient liveMode onConnect={vi.fn()} onDisconnect={vi.fn()} />
    </BrowserRouter>,
  )

  // Verify useLiveMode is called with proper client and callbacks
  expect(mockUseLiveMode).toHaveBeenCalledWith({
    client: expect.any(Object),
    onConnect: expect.any(Function),
    onDisconnect: expect.any(Function),
  })
})

it('should integrate enableVisualEditing with history and refresh for comlink functionality', () => {
  render(
    <BrowserRouter>
      <VisualEditingClient zIndex={1000} />
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
