import {expect, test, type Page} from '@playwright/test'

/** Packages that a production page must never load (spec 7.1 deny list). */
const DENY_LIST = [
  '@sanity/visual-editing',
  '@sanity/react-loader',
  '@sanity/core-loader',
  '@sanity/comlink',
  '@sanity/presentation-comlink',
  '@sanity/visual-editing-csm',
  '@sanity/preview-url-secret',
]

/**
 * Spec 7.2.1 budgets for the home route (fetch + `<SanityImage>`), in gzip bytes, summed per chunk.
 *
 * Baseline 2026-11-15: first-party 2,107 B (image 1,201 + root gates 458 + usePreview 448), all
 * `@sanity/*` 8,441 B (`@sanity/image-url` alone is 4,018 B, `@sanity/asset-utils` 3,065 B). The
 * spec proposal of 3 KB total is below the upstream image-url floor. See DECISIONS.md.
 */
const BUDGET = {firstParty: 2_500, sanityTotal: 9_000}

interface ChunkInfo {
  packages: string[]
  sanityGzip: number
  byPackage: Record<string, number>
}

/** Stega encodes source maps as runs of zero-width characters. */
const STEGA = /[​‌‍⁠﻿]{4,}/

async function trackChunks(page: Page): Promise<string[]> {
  const chunks: string[] = []
  // The live client and the image CDN are external. Block them to keep E2E offline.
  await page.route(/sanity\.io/, (route) => route.abort())
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/^\/(assets\/[^?]+\.js)$/)
    if (match?.[1]) chunks.push(match[1])
  })
  return chunks
}

async function moduleMap(page: Page): Promise<Record<string, ChunkInfo>> {
  const response = await page.request.get('/module-map.json')
  expect(response.ok()).toBe(true)
  return response.json()
}

async function enterPreview(page: Page) {
  await page.goto('/api/preview?sanity-preview-secret=valid-secret&sanity-preview-pathname=/')
  await expect(page).toHaveURL('/')
}

test.describe('production', () => {
  test('renders published content with no stega and reports cache status', async ({page}) => {
    const first = await page.goto('/')
    await expect(page.getByTestId('title')).toHaveText('Published home')
    expect(STEGA.test(await page.content())).toBe(false)
    expect(first?.headers()['server-timing']).toMatch(/^sanity;desc="hit=\d+ stale=\d+ miss=\d+ bypass=0"/)
    expect(first?.headers()['cache-control'] ?? '').not.toContain('private')

    const second = await page.goto('/')
    expect(second?.headers()['server-timing']).toContain('hit=1')
  })

  test('loads no preview chunk and stays within the bundle budget', async ({page}) => {
    const chunks = await trackChunks(page)
    await page.goto('/')
    await expect(page.getByTestId('title')).toHaveText('Published home')
    await page.waitForLoadState('networkidle')

    const map = await moduleMap(page)
    const loaded = [...new Set(chunks)]
    expect(loaded.length).toBeGreaterThan(0)
    for (const chunk of loaded) {
      const info = map[chunk]
      expect(info, `module map has ${chunk}`).toBeDefined()
      const denied = info?.packages.filter((name) => DENY_LIST.some((d) => name === d || name.startsWith(`${d}/`)))
      expect(denied, `${chunk} loads ${denied?.join(', ')}`).toEqual([])
    }

    // `<SanityLive>` loads its client after hydration. Exclude it from the first-load budget.
    const firstLoad = loaded.filter((chunk) => !map[chunk]?.packages.includes('@sanity/client'))
    const firstParty = firstLoad.reduce((sum, chunk) => sum + (map[chunk]?.byPackage['react-router-sanity'] ?? 0), 0)
    const total = firstLoad.reduce((sum, chunk) => sum + (map[chunk]?.sanityGzip ?? 0), 0)
    console.log(`bundle: first-party ${firstParty} B gzip, all @sanity ${total} B gzip`)
    expect(firstParty).toBeLessThanOrEqual(BUDGET.firstParty)
    expect(total).toBeLessThanOrEqual(BUDGET.sanityTotal)
  })

  test('navigates on the client through the middleware', async ({page}) => {
    await page.goto('/')
    await page.getByRole('link', {name: 'About'}).click()
    await expect(page.getByTestId('title')).toHaveText('About')
  })

  test('renders a responsive image with srcset and dimensions', async ({page}) => {
    await trackChunks(page)
    await page.goto('/')
    const image = page.getByRole('img', {name: 'A chair'})
    await expect(image).toHaveAttribute('srcset', /w=320.*320w/)
    await expect(image).toHaveAttribute('width', '1920')
    await expect(image).toHaveAttribute('height', '960')
    await expect(image).toHaveAttribute('fetchpriority', 'high')
  })
})

test.describe('preview', () => {
  test('rejects a wrong secret with 401 and no cookie', async ({request}) => {
    const response = await request.get('/api/preview?sanity-preview-secret=wrong&sanity-preview-pathname=/', {
      maxRedirects: 0,
    })
    expect(response.status()).toBe(401)
    expect(response.headers()['set-cookie']).toBeUndefined()
  })

  test('enters preview, shows drafts, marks the response private and loads overlays', async ({page}) => {
    const chunks = await trackChunks(page)
    await enterPreview(page)
    await expect(page.getByTestId('title')).toHaveText('Draft home')
    await expect(page.getByTestId('exit-preview')).toBeVisible()

    const reload = await page.reload()
    expect(reload?.headers()['cache-control']).toBe('private, no-store')
    expect(reload?.headers()['server-timing']).toContain('bypass=1')

    const map = await moduleMap(page)
    await expect
      .poll(() => chunks.some((chunk) => map[chunk]?.packages.includes('@sanity/visual-editing')), {timeout: 10_000})
      .toBe(true)
  })

  test('exits preview', async ({page}) => {
    await enterPreview(page)
    await page.getByRole('button', {name: 'Exit preview'}).click()
    await expect(page.getByTestId('title')).toHaveText('Published home')
    await expect(page.getByTestId('exit-preview')).toHaveCount(0)
  })

  test('rejects a cross-origin exit (CSRF)', async ({page}) => {
    await enterPreview(page)
    const response = await page.request.post('/api/preview', {headers: {Origin: 'https://evil.example.com'}})
    expect(response.status()).toBe(403)
    await page.reload()
    await expect(page.getByTestId('title')).toHaveText('Draft home')
  })
})

test.describe('live', () => {
  test('rejects an unsigned invalidation call', async ({request}) => {
    const response = await request.post('/api/sanity/invalidate', {data: {tags: ['s1:home']}})
    expect(response.status()).toBe(401)
  })
})
