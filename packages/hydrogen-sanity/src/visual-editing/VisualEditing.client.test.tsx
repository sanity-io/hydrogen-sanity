/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, describe, expect, it, vi} from 'vitest'

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

vi.mock('./registry', () => ({
  useHasActiveLoaders: vi.fn(() => false),
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

import {useHasActiveLoaders} from './registry'

const mockEnableVisualEditing = vi.mocked(enableVisualEditing)
const mockUseLiveMode = vi.mocked(useLiveMode)
const mockCreateClient = vi.mocked(createClient)
const mockUseSubmit = vi.mocked(useSubmit)
const mockUseHasActiveLoaders = vi.mocked(useHasActiveLoaders)

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

it('should setup live mode when queries are active', () => {
  mockUseHasActiveLoaders.mockReturnValue(true)
  render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  expect(mockUseLiveMode).toHaveBeenCalled()
})

it('should create client with correct config when queries are active', () => {
  mockUseHasActiveLoaders.mockReturnValue(true)
  render(
    <BrowserRouter>
      <VisualEditingClient />
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

it('should configure stega when enabled and queries are active', () => {
  const studioUrl = 'https://studio.test.com'
  const mockClient = {
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  } as unknown as SanityClient
  mockCreateClient.mockReturnValue(mockClient)
  mockUseHasActiveLoaders.mockReturnValue(true)

  const handleFilter = vi.fn(() => true)
  render(
    <BrowserRouter>
      <VisualEditingClient filter={handleFilter} studioUrl={studioUrl} />
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

it('should not enable live mode when no queries are active', () => {
  mockUseHasActiveLoaders.mockReturnValue(false)
  render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  // When no queries are active, LiveMode component should not be rendered
  expect(mockUseLiveMode).not.toHaveBeenCalled()
})

it('should enable live mode when queries are active', () => {
  mockUseHasActiveLoaders.mockReturnValue(true)
  render(
    <BrowserRouter>
      <VisualEditingClient />
    </BrowserRouter>,
  )

  // When queries are active, LiveMode component should be rendered and useLiveMode called
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

it('should integrate useLiveMode with correct client for loader functionality when queries are active', () => {
  mockUseHasActiveLoaders.mockReturnValue(true)
  render(
    <BrowserRouter>
      <VisualEditingClient onConnect={vi.fn()} onDisconnect={vi.fn()} />
    </BrowserRouter>,
  )

  // Verify useLiveMode is called with proper client and callbacks
  expect(mockUseLiveMode).toHaveBeenCalledWith({
    client: expect.any(Object),
    onConnect: expect.any(Function),
    onDisconnect: expect.any(Function),
  })
})

describe('Query detection behavior', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockUseHasActiveLoaders.mockReturnValue(false)
  })

  it('should default to auto mode and not enable live mode when no queries are active', () => {
    mockUseHasActiveLoaders.mockReturnValue(false)

    render(
      <BrowserRouter>
        <VisualEditingClient />
      </BrowserRouter>,
    )

    // LiveMode should not be rendered when no queries are active
    expect(mockUseLiveMode).not.toHaveBeenCalled()
  })

  it('should enable live mode automatically when queries are detected in auto mode', () => {
    mockUseHasActiveLoaders.mockReturnValue(true)

    render(
      <BrowserRouter>
        <VisualEditingClient />
      </BrowserRouter>,
    )

    // LiveMode should be rendered when queries are detected
    expect(mockUseLiveMode).toHaveBeenCalled()
  })

  it('should react to changes in query detection state', () => {
    const {rerender} = render(
      <BrowserRouter>
        <VisualEditingClient />
      </BrowserRouter>,
    )

    // Initially no queries
    expect(mockUseLiveMode).not.toHaveBeenCalled()

    // Simulate queries becoming active
    mockUseHasActiveLoaders.mockReturnValue(true)

    rerender(
      <BrowserRouter>
        <VisualEditingClient />
      </BrowserRouter>,
    )

    // Now LiveMode should be active
    expect(mockUseLiveMode).toHaveBeenCalled()
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
