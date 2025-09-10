/**
 * @vitest-environment jsdom
 */
import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {usePreviewMode} from './preview/hooks'
import {Query} from './Query'

// Mock preview mode hook
vi.mock('./preview/hooks', () => ({
  usePreviewMode: vi.fn(),
}))

// Mock lazy loading
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    lazy: vi.fn(() => {
      // Return a component that renders the children with the data
      const LazyComponent = ({
        children,
      }: {
        children: (data: unknown, fn: unknown) => React.ReactNode
      }) => children(mockQueryData, vi.fn())
      LazyComponent.displayName = 'LazyComponent'
      return LazyComponent
    }),
  }
})

const mockQueryData = {
  title: 'Test Title',
  slug: 'test-slug',
}

const mockOptions = {
  initial: mockQueryData,
}

const mockUsePreviewMode = vi.mocked(usePreviewMode)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

it('renders static data in non-preview mode', () => {
  mockUsePreviewMode.mockReturnValue(false)

  render(
    <Query query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(data, encodeDataAttribute) => (
        <div>
          <h1>{data?.title}</h1>
          <span data-testid="encode-attr">{encodeDataAttribute?.('title') || 'no-attr'}</span>
        </div>
      )}
    </Query>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
  expect(screen.getByTestId('encode-attr').textContent).toBe('no-attr')
})

it('renders lazy component in preview mode after hydration', () => {
  mockUsePreviewMode.mockReturnValue(true)

  render(
    <Query query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(data) => <h1>{data?.title}</h1>}
    </Query>,
  )

  // Initially shows static data during hydration
  expect(screen.getByText('Test Title')).toBeDefined()
})

it('passes through suspense props', () => {
  mockUsePreviewMode.mockReturnValue(true)

  render(
    <Query
      query="*[_type == 'page'][0]"
      params={{}}
      options={mockOptions}
      fallback={<div>Custom Loading</div>}
    >
      {(data) => <h1>{data?.title}</h1>}
    </Query>,
  )

  expect(screen.getByText('Test Title')).toBeDefined()
})

it('provides noop encodeDataAttribute with correct shape', () => {
  mockUsePreviewMode.mockReturnValue(false)

  render(
    <Query query="*[_type == 'page'][0]" params={{}} options={mockOptions}>
      {(_, encodeDataAttribute) => {
        // Test that encodeDataAttribute has the correct shape
        const attr = encodeDataAttribute?.('title')
        const scopedAttr = encodeDataAttribute?.scope('content')

        return (
          <div>
            <span data-testid="attr">{attr || 'undefined'}</span>
            <span data-testid="scope">
              {typeof scopedAttr === 'function' ? 'function' : 'not-function'}
            </span>
          </div>
        )
      }}
    </Query>,
  )

  expect(screen.getByTestId('attr').textContent).toBe('undefined')
  expect(screen.getByTestId('scope').textContent).toBe('function')
})
