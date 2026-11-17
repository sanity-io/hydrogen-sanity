import type {ContentSourceMap} from '@sanity/client'
import {type StegaBranded, stegaEncodeSourceMap} from '@sanity/client/stega'
import {afterEach, describe, expect, expectTypeOf, it} from 'vitest'

import type {InferImageValue} from '../image'
import {getImageProps, type GetImagePropsOptions} from './getImageProps'

const projectId = 'abc123'
const dataset = 'production'
const cdn = `https://cdn.sanity.io/images/${projectId}/${dataset}`
const assetId = 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x1000-jpg'
const assetUrl = `${cdn}/Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x1000.jpg`
const lqip =
  'data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/'

function stega<T>(value: T): T {
  const sourceMap: ContentSourceMap = {
    documents: [{_id: 'page', _type: 'page'}],
    paths: ["$['value']"],
    mappings: {
      "$['value']": {type: 'value', source: {type: 'documentValue', document: 0, path: 0}},
    },
  }
  return stegaEncodeSourceMap({value}, sourceMap, {
    enabled: true,
    studioUrl: '/studio',
    filter: () => true,
  }).value
}

function srcSetEntries(srcSet: string | undefined): string[] {
  return (srcSet ?? '').split(', ')
}

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('Sanity Provider')]
})

describe('URL sources', () => {
  it('infers the dimensions from the asset filename', () => {
    const {props} = getImageProps({src: assetUrl, sizes: '100vw'})

    expect(props.width).toBe(2000)
    expect(props.height).toBe(1000)
    expect(props.style).toEqual({width: '100%', height: 'auto'})
    expect(props.sizes).toBe('100vw')
    expect(props.loading).toBe('lazy')
    expect(props.decoding).toBe('async')
    expect(props.alt).toBe('')
  })

  it('generates fluid candidates up to the source width', () => {
    const {props} = getImageProps({src: assetUrl})
    const entries = srcSetEntries(props.srcSet)

    expect(entries[0]).toBe(`${assetUrl}?auto=format&w=200&h=100&fit=min 200w`)
    expect(entries.at(-1)).toBe(`${assetUrl}?auto=format&w=2000&h=1000&fit=min 2000w`)
    expect(entries).toHaveLength(10)
    expect(props.src).toBe(`${assetUrl}?auto=format&w=2000&h=1000&fit=min`)
  })

  it('uses the w and h params of a builder URL as the intrinsic size', () => {
    const {props} = getImageProps({src: `${assetUrl}?w=800&h=600`})

    expect(props.width).toBe(800)
    expect(props.height).toBe(600)
    expect(srcSetEntries(props.srcSet).at(-1)).toBe(
      `${assetUrl}?w=800&h=600&auto=format&fit=min 800w`,
    )
  })

  it('renders a fixed-size image with density descriptors', () => {
    const {props} = getImageProps({src: assetUrl, width: 300})

    expect(props.width).toBe(300)
    expect(props.height).toBe(150)
    expect(props.srcSet).toBe(
      [
        `${assetUrl}?auto=format&w=300&h=150&fit=min 1x`,
        `${assetUrl}?auto=format&w=600&h=300&fit=min 2x`,
        `${assetUrl}?auto=format&w=900&h=450&fit=min 3x`,
      ].join(', '),
    )
  })

  it('treats fixed CSS units as a fixed width, like Hydrogen', () => {
    expect(getImageProps({src: assetUrl, width: '10rem'}).props.width).toBe(160)
    expect(getImageProps({src: assetUrl, width: '50vw'}).props.style?.width).toBe('50vw')
  })

  it('strips stega-encoded metadata', () => {
    const encoded = stega(assetUrl)
    expect(encoded).not.toBe(assetUrl)

    const {props} = getImageProps({src: encoded})
    expect(props.src).toBe(`${assetUrl}?auto=format&w=2000&h=1000&fit=min`)
  })

  it('passes data: URLs through untouched', () => {
    const {props} = getImageProps({src: lqip, width: 20, height: 10})

    expect(props.src).toBe(lqip)
    expect(props.srcSet).toBeUndefined()
    expect(props.width).toBe(20)
  })
})

describe('image objects', () => {
  const image = {
    _type: 'image',
    asset: {_id: assetId, url: assetUrl, metadata: {lqip}},
    crop: {top: 0, bottom: 0, left: 0.5, right: 0},
    hotspot: {x: 0.9, y: 0.5, width: 0.1, height: 0.1},
  }

  it('applies the Studio crop and reads the project from the asset URL', () => {
    const {props} = getImageProps({src: image})

    expect(props.width).toBe(1000)
    expect(props.height).toBe(1000)
    expect(props.src).toBe(`${assetUrl}?rect=1000,0,1000,1000&auto=format&w=1000&h=1000&fit=min`)
  })

  it('positions the CDN crop around the hotspot when the aspect ratio differs', () => {
    const {props} = getImageProps({src: image, aspectRatio: '1/2'})

    // The 500px wide rect is pushed to the right edge of the crop, where the hotspot is
    expect(props.src).toContain('rect=1500,0,500,1000')
    expect(props.width).toBe(500)
    expect(props.height).toBe(1000)
    expect(srcSetEntries(props.srcSet).at(-1)).toBe(
      `${assetUrl}?rect=1500,0,500,1000&auto=format&w=400&h=800&fit=min 400w`,
    )
  })

  it('crops around the hotspot for a fixed width and height', () => {
    const {props} = getImageProps({src: {...image, crop: null}, width: 200, height: 200})

    expect(props.src).toBe(`${assetUrl}?rect=1000,0,1000,1000&auto=format&w=200&h=200&fit=min`)
  })

  it('accepts asset references and ids with the project from the provider', () => {
    ;(globalThis as Record<symbol, unknown>)[Symbol.for('Sanity Provider')] = {
      projectId,
      dataset,
      apiHost: 'https://api.sanity.io',
    }

    expect(getImageProps({src: {asset: {_ref: assetId}}}).props.src).toBe(
      `${assetUrl}?auto=format&w=2000&h=1000&fit=min`,
    )
    expect(getImageProps({src: assetId}).props.src).toBe(
      `${assetUrl}?auto=format&w=2000&h=1000&fit=min`,
    )
  })

  it('derives the CDN host from the provider API host', () => {
    ;(globalThis as Record<symbol, unknown>)[Symbol.for('Sanity Provider')] = {
      projectId,
      dataset,
      apiHost: 'https://api.sanity.work',
    }

    expect(getImageProps({src: assetId}).props.src).toMatch(/^https:\/\/cdn\.sanity\.work\//)
  })

  it('throws without a project to build the URL for', () => {
    expect(() => getImageProps({src: {asset: {_ref: assetId}}})).toThrow(/project id and dataset/)
  })

  it('strips stega from the asset and uses the image alt text', () => {
    const {props} = getImageProps({
      src: {
        ...image,
        alt: stega('A red chair'),
        asset: {_id: stega(assetId), url: stega(assetUrl)},
      },
    })

    expect(props.alt).toBe('A red chair')
    expect(props.src).toContain(`${assetUrl}?rect=`)
  })

  it('defaults object-position to the hotspot with fill', () => {
    const {props} = getImageProps({src: image, fill: true, sizes: '50vw'})

    expect(props.style).toMatchObject({
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: '80% 50%',
    })
    expect(props.width).toBeUndefined()
    expect(props.src).toBe(`${assetUrl}?rect=1000,0,1000,1000&auto=format&w=1000&fit=max`)
  })

  it('keeps an explicit object-position', () => {
    const {props} = getImageProps({src: image, fill: true, style: {objectPosition: 'top'}})

    expect(props.style?.objectPosition).toBe('top')
  })

  it('uses the asset LQIP for placeholder="blur"', () => {
    const blurred = getImageProps({src: image, placeholder: 'blur'}).props.style
    expect(blurred?.backgroundImage).toMatch(/^url\("data:image\/svg\+xml;charset=utf-8,/)
    expect(decodeURIComponent(blurred?.backgroundImage ?? '')).toContain(lqip)

    expect(getImageProps({src: image}).props.style?.backgroundImage).toBeUndefined()
  })

  it('merges queryParams and forwards fit to the builder', () => {
    const {props} = getImageProps({
      src: image,
      aspectRatio: '1/1',
      queryParams: {blur: 50, w: 1, fit: 'crop'},
    })

    expect(props.src).toBe(
      `${assetUrl}?rect=1000,0,1000,1000&fit=crop&blur=50&auto=format&w=1000&h=1000`,
    )
    expect(() => getImageProps({src: image, queryParams: {fit: 'nope'}})).toThrow(
      /Invalid `queryParams.fit`/,
    )
  })

  it('accepts a custom loader', () => {
    const {props} = getImageProps({
      src: image,
      width: 100,
      loader: ({src, width}) => `${src}&custom=${width}`,
    })

    expect(props.src).toBe(`${assetUrl}?rect=1000,0,1000,1000&custom=100`)
  })
})

describe('types', () => {
  it('infers image values from query results, including stega-branded ones', () => {
    type Result = {
      title: string | null
      cover: {
        _type: 'image'
        asset: {_id: string; url: string | null; metadata: {lqip: string | null} | null} | null
        crop: {top: number; bottom: number; left: number; right: number} | null
        hotspot: {x: number; y: number; width: number; height: number} | null
      } | null
    }
    type ImageValue = InferImageValue<Result>

    expectTypeOf<NonNullable<Result['cover']>>().toExtend<ImageValue>()
    expectTypeOf<StegaBranded<NonNullable<Result['cover']>>>().toExtend<ImageValue>()
    expectTypeOf<ImageValue>().toExtend<GetImagePropsOptions['src']>()
  })
})
