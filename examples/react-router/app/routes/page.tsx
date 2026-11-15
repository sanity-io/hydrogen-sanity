import {data as response, Link} from 'react-router'
import {defineQuery, sanityContext} from 'react-router-sanity'

import type {Route} from './+types/page'

const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{title}`)

export async function loader({context, params}: Route.LoaderArgs) {
  const {data, syncTags} = await context
    .get(sanityContext)
    .fetch<{title: string} | null>({query: PAGE_QUERY, params: {slug: params.slug}})
  if (!data) throw response(null, {status: 404, statusText: 'Not Found'})
  return {page: data, syncTags}
}

export default function PageRoute({loaderData}: Route.ComponentProps) {
  return (
    <main>
      <h1 data-testid="title">{loaderData.page.title}</h1>
      <Link to="/">Home</Link>
    </main>
  )
}
