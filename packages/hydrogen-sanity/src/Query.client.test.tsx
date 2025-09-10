/**
 * @vitest-environment jsdom
 */
import {useQuery} from '@sanity/react-loader'
import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import QueryClient from './Query.client'

// Mock @sanity/react-loader
vi.mock('@sanity/react-loader', () => ({
  useQuery: vi.fn(),
}))

const mockQueryData = {
  title: 'Test Title',
  slug: 'test-slug',
}

const mockEncodeDataAttribute = Object.assign(
  vi.fn((path) => `data-sanity="${path}"`),
  {scope: vi.fn(() => mockEncodeDataAttribute)},
)

const mockOptions = {
  initial: {
    data: mockQueryData,
    sourceMap: undefined,
  },
}

const mockUseQuery = vi.mocked(useQuery)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

it('renders data when query is successful', () => {
  mockUseQuery.mockReturnValue({
    data: mockQueryData,
    error: null,
    loading: false,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  render(
    <QueryClient query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(data, encodeDataAttribute) => (
        <div>
          <h1>{data?.title}</h1>
          <span data-testid="encode-attr">{encodeDataAttribute('title')}</span>
        </div>
      )}
    </QueryClient>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
  expect(screen.getByTestId('encode-attr').textContent).toBe('data-sanity="title"')
  expect(mockEncodeDataAttribute).toHaveBeenCalledWith('title')
})

it('shows initial data during loading', () => {
  mockUseQuery.mockReturnValue({
    data: null,
    error: null,
    loading: true,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  render(
    <QueryClient query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(data, encodeDataAttribute) => (
        <div>
          <h1>{data?.title || 'Loading'}</h1>
          <span data-testid="encode-attr">{encodeDataAttribute('title')}</span>
        </div>
      )}
    </QueryClient>,
  )

  // Should show initial data during loading
  expect(screen.getByText('Test Title')).toBeDefined()
  expect(screen.getByTestId('encode-attr').textContent).toBe('data-sanity="title"')
})

it('throws error when query fails', () => {
  const mockError = new Error('Query failed')
  mockUseQuery.mockReturnValue({
    data: null,
    error: mockError,
    loading: false,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  expect(() => {
    render(
      <QueryClient query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
        {(data) => <h1>{data?.title}</h1>}
      </QueryClient>,
    )
  }).toThrow('Query failed')
})

it('handles initial data with different structures', () => {
  // Test with wrapped initial data (from loadQuery)
  const wrappedOptions = {
    initial: {
      data: mockQueryData,
      sourceMap: undefined,
    },
  }

  mockUseQuery.mockReturnValue({
    data: null,
    error: null,
    loading: true,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  render(
    <QueryClient query="*[_type == 'page'][0]" params={{}} options={wrappedOptions}>
      {(data) => <h1>{data?.title || 'Loading'}</h1>}
    </QueryClient>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
})

it('handles direct initial data (from fetch)', () => {
  // Test with direct initial data (from fetch)
  const directOptions = {
    initial: mockQueryData,
  }

  mockUseQuery.mockReturnValue({
    data: null,
    error: null,
    loading: true,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  render(
    // @ts-expect-error - Testing with direct data structure (from fetch) instead of wrapped structure (from loadQuery)
    <QueryClient query="*[_type == 'page'][0]" params={{}} options={directOptions}>
      {(data) => <h1>{data?.title || 'Loading'}</h1>}
    </QueryClient>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
})

it('passes encodeDataAttribute to children in all states', () => {
  mockUseQuery.mockReturnValue({
    data: mockQueryData,
    error: null,
    loading: false,
    encodeDataAttribute: mockEncodeDataAttribute,
  })

  render(
    <QueryClient query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(data, encodeDataAttribute) => {
        // Verify encodeDataAttribute is always provided
        expect(typeof encodeDataAttribute).toBe('function')
        expect(typeof encodeDataAttribute.scope).toBe('function')
        return <h1>{data?.title}</h1>
      }}
    </QueryClient>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
})
