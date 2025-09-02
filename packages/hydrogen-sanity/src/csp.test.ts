import {createClient} from '@sanity/client'
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'

import {createSanityCSPHelpers} from './csp'

describe('createSanityCSPHelpers', () => {
  describe('with default Sanity API host', () => {
    it('should create correct CSP directives with useProjectHostname: true', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'https://api.sanity.io',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.sanity.io/*/abc123/production',
        api: 'https://abc123.api.sanity.io',
        apiCdn: 'https://abc123.apicdn.sanity.io',
      })
    })

    it('should warn but still use project hostnames when useProjectHostname: false', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'https://api.sanity.io',
        useProjectHostname: false,
      })

      const csp = createSanityCSPHelpers(client)

      expect(consoleSpy).toHaveBeenCalledWith(
        'CSP helpers: useProjectHostname: false detected. This configuration is not recommended for Hydrogen storefronts and may result in suboptimal performance.'
      )
      expect(csp).toEqual({
        assetCdn: 'https://cdn.sanity.io/*/abc123/production',
        api: 'https://abc123.api.sanity.io',
        apiCdn: 'https://abc123.apicdn.sanity.io',
      })
      
      consoleSpy.mockRestore()
    })

    it('should default to project hostnames when useProjectHostname not specified', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'https://api.sanity.io',
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.sanity.io/*/abc123/production',
        api: 'https://abc123.api.sanity.io',
        apiCdn: 'https://abc123.apicdn.sanity.io',
      })
    })
  })

  describe('with custom API host', () => {
    it('should create correct CSP directives with useProjectHostname: true', () => {
      const client = createClient({
        projectId: 'xyz321',
        dataset: 'staging',
        apiHost: 'https://api.totally.custom',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.totally.custom/*/xyz321/staging',
        api: 'https://xyz321.api.totally.custom',
        apiCdn: 'https://xyz321.apicdn.totally.custom',
      })
    })

    it('should still use project hostnames with custom host when useProjectHostname: false', () => {
      const client = createClient({
        projectId: 'xyz321',
        dataset: 'staging',
        apiHost: 'https://api.totally.custom',
        useProjectHostname: false,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.totally.custom/*/xyz321/staging',
        api: 'https://xyz321.api.totally.custom',
        apiCdn: 'https://xyz321.apicdn.totally.custom',
      })
    })

    it('should handle custom host without api. prefix', () => {
      const client = createClient({
        projectId: 'test123',
        dataset: 'production',
        apiHost: 'https://custom.domain.com',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://custom.domain.com/*/test123/production',
        api: 'https://test123.custom.domain.com',
        apiCdn: 'https://test123.custom.domain.com',
      })
    })
  })

  describe('with CDN as apiHost', () => {
    it('should handle when apiHost is already the CDN', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'foo',
        apiHost: 'https://cdn.sanity.io',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.sanity.io/*/abc123/foo',
        api: 'https://abc123.cdn.sanity.io',
        apiCdn: 'https://abc123.cdn.sanity.io',
      })
    })

    it('should handle custom CDN as apiHost', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'foo',
        apiHost: 'https://cdn.sanity.lol',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.sanity.lol/*/abc123/foo',
        api: 'https://abc123.cdn.sanity.lol',
        apiCdn: 'https://abc123.cdn.sanity.lol',
      })
    })
  })

  describe('with different protocols', () => {
    it('should preserve HTTP protocol', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'http://api.sanity.io',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'http://cdn.sanity.io/*/abc123/production',
        api: 'http://abc123.api.sanity.io',
        apiCdn: 'http://abc123.apicdn.sanity.io',
      })
    })
  })

  describe('error cases', () => {
    it('should throw error when projectId is missing', () => {
      expect(() => createClient({
        dataset: 'production',
        apiHost: 'https://api.sanity.io',
      })).toThrow(
        'Configuration must contain `projectId`',
      )
    })

    it('should throw error when dataset is missing', () => {
      const client = createClient({
        projectId: 'abc123',
        apiHost: 'https://api.sanity.io',
      })

      expect(() => createSanityCSPHelpers(client)).toThrow(
        'Sanity client must have projectId and dataset configured',
      )
    })

    it('should throw error when both projectId and dataset are missing', () => {
      expect(() => createClient({
        apiHost: 'https://api.sanity.io',
      })).toThrow(
        'Configuration must contain `projectId`',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle apiHost with port numbers', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'https://api.custom.com:8080',
        useProjectHostname: true,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.custom.com:8080/*/abc123/production',
        api: 'https://abc123.api.custom.com:8080',
        apiCdn: 'https://abc123.apicdn.custom.com:8080',
      })
    })

    it('should handle apiHost with paths when useProjectHostname: false', () => {
      const client = createClient({
        projectId: 'abc123',
        dataset: 'production',
        apiHost: 'https://api.custom.com/v1',
        useProjectHostname: false,
      })

      const csp = createSanityCSPHelpers(client)

      expect(csp).toEqual({
        assetCdn: 'https://cdn.custom.com/v1/*/abc123/production',
        api: 'https://abc123.api.custom.com/v1',
        apiCdn: 'https://abc123.apicdn.custom.com/v1',
      })
    })
  })

  describe('warning behavior', () => {
    it('should not warn again after first warning due to once utility', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Create client with useProjectHostname: false
      // Note: Warning was already triggered in earlier test, so this won't warn again
      const client = createClient({
        projectId: 'test456',
        dataset: 'development',
        apiHost: 'https://api.sanity.io',
        useProjectHostname: false,
      })

      createSanityCSPHelpers(client)

      // Should not warn again due to the once utility
      expect(consoleSpy).toHaveBeenCalledTimes(0)
      
      consoleSpy.mockRestore()
    })
  })
})