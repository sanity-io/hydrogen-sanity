import {Await, useLoaderData} from 'react-router';
import type {SeoHandleFunction} from '@shopify/hydrogen';
import clsx from 'clsx';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';

import PageHero from '~/components/heroes/Page';
import PortableText from '~/components/portableText/PortableText';
import type {SanityPage} from '~/lib/sanity';
import {ColorTheme} from '~/lib/theme';
import {fetchGids, notFound, validateLocale} from '~/lib/utils';
import {PAGE_QUERY} from '~/queries/sanity/page';
import type {Route} from './+types/($lang).pages.$handle';

const seo: SeoHandleFunction<typeof loader> = ({data}) => ({
  title: data?.page?.seo?.title,
  description: data?.page?.seo?.description,
  media: data?.page?.seo?.image,
});

export const handle = {
  seo,
};

export async function loader({params, context}: Route.LoaderArgs) {
  validateLocale({context, params});

  const {handle} = params;
  invariant(handle, 'Missing page handle');

  const cache = context.storefront.CacheCustom({
    mode: 'public',
    maxAge: 60,
    staleWhileRevalidate: 60,
  });

  const page = await context.sanity.query<SanityPage>(
    PAGE_QUERY,
    {
      slug: handle,
    },
    {hydrogen: {cache}},
  );

  if (!page) {
    throw notFound();
  }

  const gids = await fetchGids({page, context});

  return {page, gids};
}

export default function Page() {
  const {page, gids} = useLoaderData<typeof loader>();

  return (
    <ColorTheme value={page.colorTheme}>
      <Suspense>
        <Await resolve={gids}>
          <PageHero fallbackTitle={page.title} hero={page.hero} />
          {page.body && (
            <PortableText
              blocks={page.body}
              centered
              className={clsx(
                'mx-auto max-w-[660px] px-4 pb-24 pt-8',
                'md:px-8',
              )}
            />
          )}
        </Await>
      </Suspense>
    </ColorTheme>
  );
}
