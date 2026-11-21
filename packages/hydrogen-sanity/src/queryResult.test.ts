import {expect, it} from 'vitest'

import {isQueryResponseInitial} from './queryResult'

it('recognizes the preview mode result shape', () => {
  expect(isQueryResponseInitial({data: null, sourceMap: undefined, perspective: 'drafts'})).toBe(
    true,
  )
})

it('treats query results as results', () => {
  expect(isQueryResponseInitial(null)).toBe(false)
  expect(isQueryResponseInitial([{data: 1}])).toBe(false)
  expect(isQueryResponseInitial({_id: 'page', data: 'a field named data'})).toBe(false)
})
