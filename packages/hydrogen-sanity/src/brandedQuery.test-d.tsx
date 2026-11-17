import type {Any} from '@sanity/client'
import type {QueryResponseInitial} from '@sanity/react-loader'
import {defineQuery} from 'groq'
import {describe, expectTypeOf, test} from 'vitest'

import type {SanityContext} from './context'
import {Query} from './Query'
import {useQuery} from './visual-editing/useQuery'

// The shape `@sanity-labs/groq-content-mapper` gives the default export of an imported `.groq`
// file. It is read structurally, so it is declared by hand here.
type BrandedQuery<Result, Params> = string & {__groqResult: Result; __groqParams: Params}

type Post = {_id: string; title: string}
type PostParams = {slug: string}

declare const postQuery: BrandedQuery<Post, PostParams>
declare const optionalBrandQuery: string & {
  readonly __groqResult?: Post[]
  readonly __groqParams?: {limit?: number}
}

const REGISTERED_QUERY = "*[_type == 'registeredPost'][0]"
type RegisteredPost = {_id: string; registered: true}

declare module '@sanity/client' {
  interface SanityQueries {
    "*[_type == 'registeredPost'][0]": RegisteredPost
  }
}

declare const sanity: SanityContext

describe('branded queries', () => {
  test('fetch infers the result and checks params', async () => {
    expectTypeOf(await sanity.fetch(postQuery, {slug: 'hello'})).toEqualTypeOf<Post>()
    // @ts-expect-error -- `slug` has the wrong type
    await sanity.fetch(postQuery, {slug: 1})
    // @ts-expect-error -- `slug` is required
    await sanity.fetch(postQuery, {})
    // @ts-expect-error -- `slug` is required
    await sanity.fetch(postQuery, {other: 'hello'})
  })

  test('loadQuery infers the result and checks params', async () => {
    expectTypeOf(await sanity.loadQuery(postQuery, {slug: 'hello'})).toEqualTypeOf<
      QueryResponseInitial<Post>
    >()
    // @ts-expect-error -- `slug` has the wrong type
    await sanity.loadQuery(postQuery, {slug: 1})
    // @ts-expect-error -- `slug` is required
    await sanity.loadQuery(postQuery, {})
  })

  test('query infers the result and checks params', async () => {
    expectTypeOf(await sanity.query(postQuery, {slug: 'hello'})).toEqualTypeOf<
      QueryResponseInitial<Post> | Post
    >()
    // @ts-expect-error -- `slug` has the wrong type
    await sanity.query(postQuery, {slug: 1})
    // @ts-expect-error -- `slug` is required
    await sanity.query(postQuery, {})
  })

  test('optional brand properties resolve the same way', async () => {
    expectTypeOf(await sanity.fetch(optionalBrandQuery, {limit: 10})).toEqualTypeOf<Post[]>()
    expectTypeOf(await sanity.fetch(optionalBrandQuery, {})).toEqualTypeOf<Post[]>()
    // @ts-expect-error -- `limit` has the wrong type
    await sanity.fetch(optionalBrandQuery, {limit: '10'})
  })

  test('the Query component infers the result and checks params', () => {
    ;<Query query={postQuery} params={{slug: 'hello'}} options={{initial: {_id: '', title: ''}}}>
      {(data) => {
        expectTypeOf(data).toEqualTypeOf<Post>()
        return null
      }}
    </Query>
    ;<Query
      query={postQuery}
      // @ts-expect-error -- `slug` has the wrong type
      params={{slug: 1}}
      options={{initial: {_id: '', title: ''}}}
    >
      {() => null}
    </Query>
    ;<Query
      query={postQuery}
      // @ts-expect-error -- `slug` is required
      params={{}}
      options={{initial: {_id: '', title: ''}}}
    >
      {() => null}
    </Query>
  })

  test('useQuery infers the result and checks params', () => {
    expectTypeOf(useQuery(postQuery, {slug: 'hello'}).data).toEqualTypeOf<Post>()
    // @ts-expect-error -- `slug` has the wrong type
    useQuery(postQuery, {slug: 1})
    // @ts-expect-error -- `slug` is required
    useQuery(postQuery, {})
  })
})

describe('unbranded queries resolve as before', () => {
  test('plain strings fall back to `any`', async () => {
    expectTypeOf(await sanity.fetch('*[_type == $type]', {type: 'post'})).toEqualTypeOf<Any>()
    expectTypeOf(await sanity.fetch('*[_type == "post"]')).toEqualTypeOf<Any>()
    expectTypeOf(await sanity.loadQuery('*[_type == "post"]')).toEqualTypeOf<
      QueryResponseInitial<Any>
    >()
    expectTypeOf(useQuery('*[_type == "post"]').data).toEqualTypeOf<unknown>()
  })

  test('defineQuery without a registration falls back to `any`', async () => {
    const query = defineQuery('*[_type == "unregistered"]')
    expectTypeOf(await sanity.fetch(query, {any: 'param'})).toEqualTypeOf<Any>()
    expectTypeOf(await sanity.query(query)).toEqualTypeOf<Any>()
  })

  test('explicit generics win', async () => {
    expectTypeOf(await sanity.fetch<Post>('*[_type == "post"][0]', {})).toEqualTypeOf<Post>()
    expectTypeOf(await sanity.loadQuery<Post>('*[_type == "post"][0]')).toEqualTypeOf<
      QueryResponseInitial<Post>
    >()
    expectTypeOf(await sanity.query<Post>('*[_type == "post"][0]')).toEqualTypeOf<
      QueryResponseInitial<Post> | Post
    >()
    expectTypeOf(useQuery<Post>('*[_type == "post"][0]').data).toEqualTypeOf<Post>()
    ;<Query<Post> query="*[_type == 'post'][0]" options={{initial: {_id: '', title: ''}}}>
      {(data) => {
        expectTypeOf(data).toEqualTypeOf<Post>()
        return null
      }}
    </Query>
  })

  test('SanityQueries registrations resolve', async () => {
    expectTypeOf(await sanity.fetch(REGISTERED_QUERY)).toEqualTypeOf<RegisteredPost>()
    expectTypeOf(await sanity.loadQuery(REGISTERED_QUERY, {})).toEqualTypeOf<
      QueryResponseInitial<RegisteredPost>
    >()
    expectTypeOf(await sanity.query(REGISTERED_QUERY)).toEqualTypeOf<
      QueryResponseInitial<RegisteredPost> | RegisteredPost
    >()
    // `useQuery` never read the registry, and still doesn't
    expectTypeOf(useQuery(REGISTERED_QUERY).data).toEqualTypeOf<unknown>()
  })

  test('useQuery still infers the result from `initial`', () => {
    const initial = {data: {_id: '', title: ''} as Post, sourceMap: undefined}
    expectTypeOf(useQuery('*[_type == "post"][0]', {}, {initial}).data).toEqualTypeOf<Post>()
  })

  test('code generic over the query string still compiles', () => {
    function load<const Q extends string>(query: Q) {
      return sanity.fetch(query, {slug: 'hello'})
    }
    function loadWithoutParams<Q extends string>(query: Q) {
      return sanity.loadQuery(query)
    }
    expectTypeOf(load).toBeFunction()
    expectTypeOf(loadWithoutParams).toBeFunction()
  })
})
