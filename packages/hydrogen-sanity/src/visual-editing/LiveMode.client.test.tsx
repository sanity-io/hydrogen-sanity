/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, expect, it, vi} from 'vitest'

import LiveMode from './LiveMode.client'

// Mock external dependencies
vi.mock('@sanity/react-loader', () => ({
  useLiveMode: vi.fn(),
}))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  })),
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

const {useLiveMode} = await import('@sanity/react-loader')
const mockUseLiveMode = vi.mocked(useLiveMode)

beforeEach(() => {
  vi.clearAllMocks()
})

it('should enable live mode with client', () => {
  render(
    <BrowserRouter>
      <LiveMode />
    </BrowserRouter>,
  )

  expect(mockUseLiveMode).toHaveBeenCalledWith({
    client: expect.any(Object),
    onConnect: undefined,
    onDisconnect: undefined,
  })
})

it('should return null (no visual output)', () => {
  const {container} = render(
    <BrowserRouter>
      <LiveMode />
    </BrowserRouter>,
  )

  expect(container.firstChild).toBeNull()
})
