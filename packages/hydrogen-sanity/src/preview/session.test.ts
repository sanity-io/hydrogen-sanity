import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'
import {describe, expect, it} from 'vitest'

import {PreviewSession} from './session'

const secrets = ['test-secret']

/**
 * Presentation loads the storefront as a cross-site iframe navigation.
 */
const crossSiteIframeHeaders = {
  'sec-fetch-dest': 'iframe',
  'sec-fetch-site': 'cross-site',
}

/**
 * Entering preview mode by opening the preview URL in a new tab.
 */
const topLevelHeaders = {
  'sec-fetch-dest': 'document',
  'sec-fetch-site': 'none',
}

function createRequest(headers?: Record<string, string>) {
  return new Request('https://storefront.example/api/preview?secret=test', {headers})
}

/** Turn a `Set-Cookie` header back into a `Cookie` header for the next request. */
function asCookieHeader(setCookie: string): string {
  return setCookie.split(';')[0]
}

async function enterPreviewMode(request: Request): Promise<string> {
  const session = await PreviewSession.init(request, secrets)
  session.set('perspective', 'drafts')
  return session.commit()
}

describe('PreviewSession', () => {
  it('sets the baseline cross-site cookie attributes', async () => {
    const setCookie = await enterPreviewMode(createRequest(crossSiteIframeHeaders))

    expect(setCookie).toContain(`${perspectiveCookieName}=`)
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=None')
  })

  describe('CHIPS partitioning', () => {
    it('partitions the cookie for a cross-site iframe request', async () => {
      const setCookie = await enterPreviewMode(createRequest(crossSiteIframeHeaders))

      expect(setCookie).toContain('Partitioned')
    })

    it('does not partition the cookie for a top-level request', async () => {
      const setCookie = await enterPreviewMode(createRequest(topLevelHeaders))

      expect(setCookie).not.toContain('Partitioned')
    })

    it('does not partition the cookie when Sec-Fetch headers are absent', async () => {
      const setCookie = await enterPreviewMode(createRequest())

      expect(setCookie).not.toContain('Partitioned')
    })

    it('keeps partitioning later same-origin writes from inside the iframe', async () => {
      const enabled = await enterPreviewMode(createRequest(crossSiteIframeHeaders))

      // A perspective change is a same-origin fetch, so it carries no iframe
      // signal — the decision has to come from the cookie that was sent back.
      const session = await PreviewSession.init(
        createRequest({
          'cookie': asCookieHeader(enabled),
          'sec-fetch-dest': 'empty',
          'sec-fetch-site': 'same-origin',
        }),
        secrets,
      )
      session.set('perspective', 'published')

      expect(await session.commit()).toContain('Partitioned')
    })

    it('does not partition later writes when preview was entered top-level', async () => {
      const enabled = await enterPreviewMode(createRequest(topLevelHeaders))

      const session = await PreviewSession.init(
        createRequest({
          'cookie': asCookieHeader(enabled),
          'sec-fetch-dest': 'empty',
          'sec-fetch-site': 'same-origin',
        }),
        secrets,
      )
      session.set('perspective', 'published')

      expect(await session.commit()).not.toContain('Partitioned')
    })
  })

  describe('disabling preview mode', () => {
    it('expires a partitioned cookie with matching attributes', async () => {
      const enabled = await enterPreviewMode(createRequest(crossSiteIframeHeaders))

      const session = await PreviewSession.init(
        createRequest({cookie: asCookieHeader(enabled)}),
        secrets,
      )
      const setCookie = await session.destroy()

      // A partitioned cookie can only be cleared by an expiry that also carries
      // `Partitioned`, otherwise it lingers in the partitioned jar.
      expect(setCookie).toContain('Partitioned')
      expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    })

    it('expires an unpartitioned cookie without the attribute', async () => {
      const enabled = await enterPreviewMode(createRequest(topLevelHeaders))

      const session = await PreviewSession.init(
        createRequest({cookie: asCookieHeader(enabled)}),
        secrets,
      )
      const setCookie = await session.destroy()

      expect(setCookie).not.toContain('Partitioned')
      expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    })
  })

  describe('cookie option overrides', () => {
    it('honours an explicit opt in for a top-level request', async () => {
      const session = await PreviewSession.init(createRequest(topLevelHeaders), secrets, {
        partitioned: true,
      })
      session.set('perspective', 'drafts')

      expect(await session.commit()).toContain('Partitioned')
    })

    it('honours an explicit opt out for a cross-site iframe request', async () => {
      const session = await PreviewSession.init(createRequest(crossSiteIframeHeaders), secrets, {
        partitioned: false,
      })
      session.set('perspective', 'drafts')

      expect(await session.commit()).not.toContain('Partitioned')
    })

    it('applies other cookie attributes without letting the name be changed', async () => {
      const session = await PreviewSession.init(createRequest(), secrets, {maxAge: 60})
      session.set('perspective', 'drafts')
      const setCookie = await session.commit()

      expect(setCookie).toContain(`${perspectiveCookieName}=`)
      expect(setCookie).toContain('Max-Age=60')
    })
  })
})
