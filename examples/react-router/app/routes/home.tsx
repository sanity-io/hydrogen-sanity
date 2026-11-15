import {Link} from 'react-router'
import {defineQuery, sanityContext} from 'react-router-sanity'
import {SanityImage, type SanityImageValue} from 'react-router-sanity/image'

import type {Route} from './+types/home'

const HOME_QUERY = defineQuery(`*[_type == "home"][0]{title, image{alt, asset->{_id, url, metadata{lqip}}}}`)

interface Home {
  title: string
  image: SanityImageValue | null
}

export async function loader({context}: Route.LoaderArgs) {
  const {data, syncTags} = await context.get(sanityContext).fetch<Home | null>({query: HOME_QUERY})
  return {home: data, syncTags}
}

export default function HomeRoute({loaderData}: Route.ComponentProps) {
  const {home} = loaderData
  return (
    <main>
      <h1 data-testid="title">{home?.title}</h1>
      {home?.image ? <SanityImage value={home.image} sizes="100vw" priority /> : null}
      <Link to="/pages/about">About</Link>
    </main>
  )
}
