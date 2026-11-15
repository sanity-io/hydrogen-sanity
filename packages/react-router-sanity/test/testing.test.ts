import type {RouterContextProvider} from 'react-router'
import {describe, expect, it} from 'vitest'

import {defineQuery, sanityContext} from '../src'
import {createTestSanityContext} from '../src/testing'

const PAGE_QUERY = defineQuery('*[_type == "page" && slug.current == $slug][0]{title}')

/** A loader as an app writes it. */
async function loader({context, params}: {context: Readonly<RouterContextProvider>; params: {slug: string}}) {
  const {data, syncTags} = await context.get(sanityContext).fetch<{title: string}>({query: PAGE_QUERY, params})
  return {page: data, syncTags}
}

describe('createTestSanityContext', () => {
  it('answers a loader query from a result map and records the call', async () => {
    const {context, calls} = createTestSanityContext({
      results: {[PAGE_QUERY]: {title: 'Home'}},
      syncTags: ['s1:page'],
    })
    expect(await loader({context, params: {slug: 'home'}})).toEqual({page: {title: 'Home'}, syncTags: ['s1:page']})
    expect(calls[0]?.params).toEqual({slug: 'home'})
  })

  it('fails on a query without a result', async () => {
    const {context} = createTestSanityContext()
    await expect(loader({context, params: {slug: 'x'}})).rejects.toThrow(/no result for query/)
  })

  it('sets the preview state', () => {
    const {context} = createTestSanityContext({preview: {enabled: true, perspective: 'drafts'}})
    expect(context.get(sanityContext).preview).toEqual({enabled: true, perspective: 'drafts'})
  })
})
