import {beforeEach, describe, expect, it, vi} from 'vitest'

import {PreviewSession} from './fixtures'
import {isPreviewEnabled} from './preview/utils'
import {getPerspective} from './utils'
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
