import {beforeEach, describe, expect, it, vi} from 'vitest'

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
