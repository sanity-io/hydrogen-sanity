import {beforeEach, describe, expect, it, vi} from 'vitest'

import {PreviewSession} from './fixtures'
import {isPreviewEnabled} from './preview/utils'
import {getPerspective, getQueryData} from './utils'
import {sanitizePerspective, supportsPerspectiveStack} from './utils'

describe('sanitizePerspective', () => {
  it('should split comma-separated string into array', () => {
    const result = sanitizePerspective('drafts,published')

    expect(result).toEqual(['drafts', 'published'])
  })

  it('should return "drafts" when validation fails', () => {
    const result = sanitizePerspective('raw')

    expect(result).toBe('drafts')
  })
})

describe('supportsPerspectiveStack', () => {
  it('should return false for version "1"', () => {
    expect(supportsPerspectiveStack('1')).toBe(false)
  })

  it('should return true for version "X"', () => {
    expect(supportsPerspectiveStack('X')).toBe(true)
  })

  it('should return false for versions before v2025-02-19', () => {
    expect(supportsPerspectiveStack('v2024-12-31')).toBe(false)
    expect(supportsPerspectiveStack('2024-12-31')).toBe(false)
    expect(supportsPerspectiveStack('v2025-02-18')).toBe(false)
    expect(supportsPerspectiveStack('2025-02-18')).toBe(false)
  })

  it('should return true for v2025-02-19', () => {
    expect(supportsPerspectiveStack('v2025-02-19')).toBe(true)
    expect(supportsPerspectiveStack('2025-02-19')).toBe(true)
  })

  it('should return true for versions after v2025-02-19', () => {
    expect(supportsPerspectiveStack('v2025-02-20')).toBe(true)
    expect(supportsPerspectiveStack('2025-02-20')).toBe(true)
    expect(supportsPerspectiveStack('v2025-03-01')).toBe(true)
    expect(supportsPerspectiveStack('2025-03-01')).toBe(true)
    expect(supportsPerspectiveStack('v2026-01-01')).toBe(true)
  })

  it('should return false for invalid date formats', () => {
    expect(supportsPerspectiveStack('invalid')).toBe(false)
    expect(supportsPerspectiveStack('2025-2-19')).toBe(false)
    expect(supportsPerspectiveStack('25-02-19')).toBe(false)
    expect(supportsPerspectiveStack('')).toBe(false)
  })
})

describe('getPerspective', () => {
  const mockSession = {
    get: vi.fn(),
    set: vi.fn(),
    unset: vi.fn(),
    commit: vi.fn(),
    has: vi.fn(),
    destroy: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return perspective array when session has perspective data', () => {
    mockSession.has.mockReturnValue(true)
    mockSession.get.mockReturnValue('drafts,published')

    const result = getPerspective(mockSession)

    expect(result).toEqual(['drafts', 'published'])
    expect(mockSession.get).toHaveBeenCalledWith('perspective')
  })
})

describe('isPreviewEnabled', () => {
  const projectId = 'test-project-id'

  it('should return true when session contains matching project ID', () => {
    const session = new PreviewSession()
    session.set('projectId', projectId)

    expect(isPreviewEnabled(projectId, session)).toBe(true)
  })

  it('should return false when session contains different project ID', () => {
    const session = new PreviewSession()
    session.set('projectId', 'different-project-id')

    expect(isPreviewEnabled(projectId, session)).toBe(false)
  })

  it('should return false when session contains no project ID', () => {
    const session = new PreviewSession()

    expect(isPreviewEnabled(projectId, session)).toBe(false)
  })

  it('should return false when no session is provided', () => {
    expect(isPreviewEnabled(projectId, undefined)).toBe(false)
  })

  it('should return false when session is null', () => {
    // @ts-expect-error Testing null session case
    expect(isPreviewEnabled(projectId, null)).toBe(false)
  })

  it('should handle empty project ID', () => {
    const session = new PreviewSession()
    session.set('projectId', 'some-project')

    expect(isPreviewEnabled('', session)).toBe(false)
  })

  it('should handle session with undefined project ID value', () => {
    const session = new PreviewSession()
    session.set('projectId', undefined)

    expect(isPreviewEnabled(projectId, session)).toBe(false)
  })

  it('should handle session with null project ID value', () => {
    const session = new PreviewSession()
    session.set('projectId', null)

    expect(isPreviewEnabled(projectId, session)).toBe(false)
  })

  it('should be case sensitive for project ID comparison', () => {
    const session = new PreviewSession()
    session.set('projectId', 'Test-Project-ID')

    expect(isPreviewEnabled('test-project-id', session)).toBe(false)
    expect(isPreviewEnabled('Test-Project-ID', session)).toBe(true)
  })

  it('should handle whitespace in project IDs', () => {
    const session = new PreviewSession()
    session.set('projectId', ' test-project-id ')

    expect(isPreviewEnabled('test-project-id', session)).toBe(false)
    expect(isPreviewEnabled(' test-project-id ', session)).toBe(true)
  })

  it('should work with Hydrogen session interface', () => {
    const hydrogenSession = {
      get: vi.fn().mockReturnValue(projectId),
      set: vi.fn(),
      unset: vi.fn(),
      has: vi.fn(),
      commit: vi.fn(),
      destroy: vi.fn(),
    }

    expect(isPreviewEnabled(projectId, hydrogenSession)).toBe(true)
    expect(hydrogenSession.get).toHaveBeenCalledWith('projectId')
  })

  it('should work with PreviewSession interface', () => {
    const previewSession = new PreviewSession()
    previewSession.set('projectId', projectId)

    expect(isPreviewEnabled(projectId, previewSession)).toBe(true)
  })
})

describe('getQueryData', () => {
  it('should extract data from QueryResponseInitial', () => {
    const mockQueryResponse = {
      data: {id: '123', title: 'Test'},
      loading: false,
      error: undefined,
      perspective: 'previewDrafts' as const,
      sourceMap: undefined,
    }

    const result = getQueryData(mockQueryResponse)

    expect(result).toEqual({id: '123', title: 'Test'})
  })

  it('should return raw data when not QueryResponseInitial', () => {
    const rawData = {id: '456', title: 'Production'}

    const result = getQueryData(rawData)

    expect(result).toEqual({id: '456', title: 'Production'})
  })

  it('should handle null values', () => {
    const result = getQueryData(null)

    expect(result).toBe(null)
  })

  it('should handle undefined values', () => {
    const result = getQueryData(undefined)

    expect(result).toBe(undefined)
  })

  it('should handle primitive values', () => {
    expect(getQueryData('string')).toBe('string')
    expect(getQueryData(123)).toBe(123)
    expect(getQueryData(true)).toBe(true)
  })

  it('should handle arrays', () => {
    const arrayData = [{id: '1'}, {id: '2'}]

    const result = getQueryData(arrayData)

    expect(result).toEqual(arrayData)
  })

  it('should handle objects without data property', () => {
    const obj = {id: '789', title: 'Test', perspective: 'published'}

    const result = getQueryData(obj)

    expect(result).toEqual(obj)
  })

  it('should handle objects with data but missing other QueryResponseInitial properties', () => {
    const partialResponse = {data: {id: '999'}, perspective: 'published'}

    // This should be treated as QueryResponseInitial since it has 'data'
    const result = getQueryData(partialResponse)

    expect(result).toEqual({id: '999'})
  })

  it('should handle nested QueryResponseInitial structures', () => {
    const nestedResponse = {
      data: {
        id: '111',
        nested: {
          data: {value: 'nested'},
          loading: false,
        },
      },
      loading: false,
      error: undefined,
      perspective: 'previewDrafts' as const,
    }

    const result = getQueryData(nestedResponse)

    // Only unwraps the outer layer
    expect(result).toEqual({
      id: '111',
      nested: {
        data: {value: 'nested'},
        loading: false,
      },
    })
  })

  it('should be type-safe with generics', () => {
    type MyData = {id: string; title: string}

    const queryResponse = {
      data: {id: '123', title: 'Test'} as MyData,
      loading: false,
      error: undefined,
      perspective: 'previewDrafts' as const,
      sourceMap: undefined,
    }

    const result: MyData = getQueryData<MyData>(queryResponse)

    expect(result).toEqual({id: '123', title: 'Test'})
  })
})
