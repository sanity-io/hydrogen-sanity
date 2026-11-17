/**
 * @vitest-environment jsdom
 */
import {cleanup, fireEvent, render, screen} from '@testing-library/react'
import {createRef} from 'react'
import {afterEach, expect, it, vi} from 'vitest'

import {Image} from './Image'

const assetUrl =
  'https://cdn.sanity.io/images/abc123/production/Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x1000.jpg'
const image = {
  asset: {
    _id: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x1000-jpg',
    url: assetUrl,
    metadata: {lqip: 'data:image/jpeg;base64,AAAA'},
  },
  hotspot: {x: 0.25, y: 0.5},
}

afterEach(() => {
  cleanup()
})

it('renders an img with the computed attributes and forwards the ref', () => {
  const ref = createRef<HTMLImageElement>()
  render(<Image ref={ref} src={image} alt="Chair" aspectRatio="1/1" sizes="50vw" />)

  const img = screen.getByRole('img', {name: 'Chair'})
  expect(ref.current).toBe(img)
  expect(img.getAttribute('src')).toBe(
    `${assetUrl}?rect=0,0,1000,1000&auto=format&w=1000&h=1000&fit=min`,
  )
  expect(img.getAttribute('sizes')).toBe('50vw')
  expect(img.getAttribute('loading')).toBe('lazy')
  expect(img.getAttribute('width')).toBe('1000')
  expect(img.getAttribute('height')).toBe('1000')
})

it('removes the blur placeholder once the image has loaded', () => {
  const onLoad = vi.fn()
  render(<Image src={image} alt="Chair" placeholder="blur" onLoad={onLoad} />)

  const img = screen.getByRole('img', {name: 'Chair'})
  expect(img.style.backgroundImage).toMatch(/^url\("data:image\/svg\+xml/)

  fireEvent.load(img)
  expect(img.style.backgroundImage).toBe('none')
  expect(onLoad).toHaveBeenCalledOnce()
})

it('keeps a user-provided background image', () => {
  render(<Image src={image} alt="Chair" placeholder="blur" style={{backgroundImage: 'none'}} />)

  const img = screen.getByRole('img', {name: 'Chair'})
  fireEvent.load(img)
  expect(img.style.backgroundImage).toBe('none')
})
