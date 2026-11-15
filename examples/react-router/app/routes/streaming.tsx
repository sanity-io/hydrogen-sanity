import {Suspense, use} from 'react'
import {defineQuery, sanityContext, type FetchResult} from 'react-router-sanity'

import type {Route} from './+types/streaming'

const HOME_QUERY = defineQuery(`*[_type == "home"][0]{title}`)

/**
 * Rendering-mode fixture: SSR + streaming. The loader returns the `fetch` promise unawaited.
 * Limit: the sync tags of a deferred query arrive after the headers, so they never reach the CDN
 * tag header, and `<SanityLive>` sees them only through the resolved data.
 */
export function loader({context}: Route.LoaderArgs) {
  const home = context.get(sanityContext).fetch<{title: string} | null>({query: HOME_QUERY})
  return {home}
}

function Title({home}: {home: Promise<FetchResult<{title: string} | null>>}) {
  const {data} = use(home)
  return <h1 data-testid="title">{data?.title}</h1>
}

export default function StreamingRoute({loaderData}: Route.ComponentProps) {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <Title home={loaderData.home} />
      </Suspense>
    </main>
  )
}
