import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {getSanityCspDirectives, serializeCsp} from '../src/csp'
import {SanityImage, urlFor} from '../src/image'

const config = {projectId: 'p1', dataset: 'production'}
const image = {asset: {_ref: 'image-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000-jpg'}, alt: 'A chair'}

function attributes(html: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const match of html.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    const [, name, value] = match
    if (name && value !== undefined) result[name.toLowerCase()] = value.replaceAll('&amp;', '&')
  }
  return result
}

describe('SanityImage', () => {
  it('renders srcset up to the intrinsic width, with dimensions and lazy loading', () => {
    const attrs = attributes(renderToStaticMarkup(<SanityImage value={image} config={config} sizes="50vw" />))
    const widths = attrs.srcset?.split(', ').map((candidate) => candidate.split(' ')[1])
    expect(widths).toEqual(['320w', '480w', '640w', '768w', '1024w', '1280w', '1536w', '1920w'])
    expect(attrs.srcset).toContain('https://cdn.sanity.io/images/p1/production/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000.jpg?w=320&q=75&auto=format')
    expect(attrs.width).toBe('1920')
    expect(attrs.height).toBe('960')
    expect(attrs.loading).toBe('lazy')
    expect(attrs.alt).toBe('A chair')
    expect(attrs.sizes).toBe('50vw')
  })

  it('applies the crop to the dimensions and the URL', () => {
    const cropped = {...image, crop: {top: 0, bottom: 0.5, left: 0, right: 0}}
    const attrs = attributes(renderToStaticMarkup(<SanityImage value={cropped} config={config} widths={[400]} />))
    expect(attrs.height).toBe('100')
    expect(attrs.src).toContain('rect=0,0,2000,500')
  })

  it('crops to an aspect ratio', () => {
    const attrs = attributes(
      renderToStaticMarkup(<SanityImage value={image} config={config} widths={[400]} aspectRatio={1} />),
    )
    expect(attrs.height).toBe('400')
    expect(attrs.src).toContain('h=400')
    expect(attrs.src).toContain('fit=crop')
  })

  it('loads a priority image eagerly with high fetch priority', () => {
    const attrs = attributes(renderToStaticMarkup(<SanityImage value={image} config={config} priority />))
    expect(attrs.loading).toBe('eager')
    expect(attrs.fetchpriority).toBe('high')
  })

  it('shows the LQIP placeholder when the query projects it', () => {
    const withLqip = {asset: {_id: 'image-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000-jpg', metadata: {lqip: 'data:image/jpeg;base64,xyz'}}}
    const html = renderToStaticMarkup(<SanityImage value={withLqip} config={config} />)
    expect(html).toContain('background-image:url(data:image/jpeg;base64,xyz)')
  })

  it('reads the project from an expanded asset URL', () => {
    const expanded = {
      asset: {_id: 'image-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000-jpg', url: 'https://cdn.sanity.io/images/p9/staging/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000.jpg'},
    }
    expect(urlFor(expanded)?.url()).toContain('/images/p9/staging/')
  })

  it('renders nothing for an image without an asset', () => {
    expect(renderToStaticMarkup(<SanityImage value={{asset: null}} config={config} />)).toBe('')
  })
})

describe('getSanityCspDirectives', () => {
  it('adds the Studio to frame-ancestors only in preview', () => {
    const production = getSanityCspDirectives({projectId: 'p1', studioUrl: 'https://studio.example.com/desk', preview: false})
    const preview = getSanityCspDirectives({projectId: 'p1', studioUrl: 'https://studio.example.com/desk', preview: true})
    expect(production['frame-ancestors']).toBeUndefined()
    expect(preview['frame-ancestors']).toEqual(["'self'", 'https://studio.example.com'])
    expect(preview['connect-src']).toContain('https://p1.apicdn.sanity.io')
  })

  it('merges policies without duplicate sources', () => {
    expect(serializeCsp({'img-src': ["'self'", 'https://cdn.sanity.io']}, {'img-src': ['https://cdn.sanity.io']})).toBe(
      "img-src 'self' https://cdn.sanity.io",
    )
  })
})
