import {Await, useLoaderData} from 'react-router';
import {AnalyticsPageType, type SeoHandleFunction} from '@shopify/hydrogen';
import clsx from 'clsx';
import {Suspense} from 'react';

import HomeHero from '~/components/heroes/Home';
import ModuleGrid from '~/components/modules/ModuleGrid';
import type {SanityHomePage} from '~/lib/sanity';
import {SanityPreview} from '~/lib/preview';
import {fetchGids, notFound, validateLocale} from '~/lib/utils';
import {HOME_PAGE_QUERY} from '~/queries/sanity/home';
import type {Route} from './+types/($lang)._index';

const seo: SeoHandleFunction = ({data}) => ({
  title: data?.page?.seo?.title || 'Sanity x Hydrogen',
  description:
    data?.page?.seo?.description ||
    'A custom storefront powered by Hydrogen and Sanity',
});

export const handle = {
  seo,
};

export async function loader({context, params}: Route.LoaderArgs) {
  validateLocale({context, params});

  const cache = context.storefront.CacheCustom({
    mode: 'public',
    maxAge: 60,
    staleWhileRevalidate: 60,
  });

  const page = await context.sanity.query<SanityHomePage>(
    HOME_PAGE_QUERY,
    undefined,
    {hydrogen: {cache}},
  );

  if (!page) {
    throw notFound();
  }

  const gids = await fetchGids({page, context});

  return {
    page,
    gids,
    analytics: {
      pageType: AnalyticsPageType.home,
    },
  };
}

export default function Index() {
  const {page, gids} = useLoaderData<typeof loader>();

  return (
    <SanityPreview data={page} query={HOME_PAGE_QUERY}>
      {(page) => (
        <Suspense>
          <Await resolve={gids}>
            {page?.hero && <HomeHero hero={page.hero} />}

            {page?.modules && (
              <div className={clsx('mb-32 mt-24 px-4', 'md:px-8')}>
                <ModuleGrid items={page.modules} />
              </div>
            )}
          </Await>
        </Suspense>
      )}
    </SanityPreview>
  );
}
