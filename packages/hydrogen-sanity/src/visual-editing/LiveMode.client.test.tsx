/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react'
import {BrowserRouter} from 'react-router'
import {beforeEach, expect, it, vi} from 'vitest'

import {useSanityProviderValue} from '../provider'
import LiveModeClient from './LiveMode.client'

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
      <LiveModeClient />
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
      <LiveModeClient />
    </BrowserRouter>,
  )

  expect(container.firstChild).toBeNull()
})

it('defaults `studioUrl` to the server client value', async () => {
  const {createClient} = await import('@sanity/client')
  vi.mocked(useSanityProviderValue).mockReturnValueOnce({
    projectId: 'test-project',
    dataset: 'production',
    apiHost: 'https://api.sanity.io',
    perspective: 'drafts',
    apiVersion: '2025-02-19',
    previewEnabled: true,
    stegaEnabled: true,
    studioUrl: '/studio',
  })

  render(
    <BrowserRouter>
      <LiveModeClient />
    </BrowserRouter>,
  )

  const baseClient = vi.mocked(createClient).mock.results[0]?.value
  expect(baseClient.withConfig).toHaveBeenCalledWith({stega: {enabled: true, studioUrl: '/studio'}})
})

it('warns in development when the server `studioUrl` is a function and no prop is passed', () => {
  vi.stubEnv('NODE_ENV', 'development')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.mocked(useSanityProviderValue).mockReturnValueOnce({
    projectId: 'test-project',
    dataset: 'production',
    apiHost: 'https://api.sanity.io',
    perspective: 'drafts',
    apiVersion: '2025-02-19',
    previewEnabled: true,
    stegaEnabled: true,
    studioUrlIsFunction: true,
  })

  render(
    <BrowserRouter>
      <LiveModeClient />
    </BrowserRouter>,
  )

  expect(warn).toHaveBeenCalledWith(expect.stringContaining('`stega.studioUrl` is a function'))
  warn.mockRestore()
  vi.unstubAllEnvs()
})
