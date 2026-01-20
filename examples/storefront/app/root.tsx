import {
  type SeoHandleFunction,
  Seo,
  ShopifySalesChannel,
  useNonce,
} from '@shopify/hydrogen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useRouteLoaderData,
  useMatches,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import tailwindStyles from '~/styles/tailwind.css?url';
import {Layout as SiteLayout} from '~/components/global/Layout';
import {GenericError} from '~/components/global/GenericError';
import {NotFound} from '~/components/global/NotFound';
import {useAnalytics} from '~/hooks/useAnalytics';
import {DEFAULT_LOCALE} from '~/lib/utils';
import {LAYOUT_QUERY} from '~/queries/sanity/layout';
import {COLLECTION_QUERY_ID} from '~/queries/shopify/collection';
import type {SanityLayout} from '~/lib/sanity';
import {VisualEditing} from 'hydrogen-sanity/visual-editing';
import {Sanity} from 'hydrogen-sanity';
import {usePreviewMode} from 'hydrogen-sanity/preview';
import {filter} from '~/lib/sanity/stega';
import type {Collection, Shop} from '@shopify/hydrogen/storefront-api-types';

export type RootLoader = typeof loader;

const seo: SeoHandleFunction<typeof loader> = ({data}) => ({
  title: data?.layout?.seo?.title,
  titleTemplate: `%s${
    data?.layout?.seo?.title ? ` · ${data?.layout?.seo?.title}` : ''
  }`,
  description: data?.layout?.seo?.description,
});

export const handle = {
  seo,
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export const links: Route.LinksFunction = () => {
  return [
    {rel: 'stylesheet', href: tailwindStyles},
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {
      rel: 'stylesheet',
      href:
        'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,500;0,700;1,500;1,700&display=swap',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;

  const cache = context.storefront.CacheCustom({
    mode: 'public',
    maxAge: 60,
    staleWhileRevalidate: 60,
  });

  const [shop, layout] = await Promise.all([
    context.storefront.query<{shop: Shop}>(SHOP_QUERY),
    context.sanity.query<SanityLayout>(LAYOUT_QUERY, undefined, {
      hydrogen: {cache},
    }),
  ]);

  const selectedLocale = context.storefront.i18n;

  const cartData = await cart.get();
  const notFoundCollectionData = layout?.notFoundPage?.collectionGid
    ? await context.storefront.query<{collection: Collection}>(COLLECTION_QUERY_ID, {
        variables: {
          id: layout.notFoundPage.collectionGid,
          count: 16,
        },
      })
    : undefined;

  return {
    analytics: {
      shopifySalesChannel: ShopifySalesChannel.hydrogen,
      shopId: shop.shop.id,
    },
    cart: cartData,
    layout,
    notFoundCollection: notFoundCollectionData,
    sanityProjectID: context.env.SANITY_PROJECT_ID,
    sanityDataset: context.env.SANITY_DATASET,
    selectedLocale,
    storeDomain: context.storefront.getShopifyDomain(),
    studioOrigin: context.env.SANITY_STUDIO_ORIGIN,
  };
}

export const useRootLoaderData = () => {
  const [root] = useMatches();
  const rootLoaderData = useRouteLoaderData<RootLoader>('root');
  return (rootLoaderData ?? root?.data) as Route.ComponentProps['loaderData'];
};

export function Document({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const previewMode = usePreviewMode();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        {previewMode ? (
          <VisualEditing
            action="/api/preview"
            filter={filter}
            studioUrl={data?.studioOrigin}
          />
        ) : null}
        <Sanity nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const {layout, selectedLocale} = useRouteLoaderData<RootLoader>('root');
  const locale = selectedLocale ?? DEFAULT_LOCALE;
  const hasUserConsent = true;

  useAnalytics(hasUserConsent);

  return (
    <Document>
      <SiteLayout key={`${locale.language}-${locale.country}`}>
        <Outlet />
      </SiteLayout>
    </Document>
  );
}

export function ErrorBoundary({error}: {error: Error}) {
  const routeError = useRouteError();
  const isRouteError = isRouteErrorResponse(routeError);

  const rootData = useRootLoaderData();

  const {
    selectedLocale: locale,
    layout,
    notFoundCollection,
  } = rootData
    ? rootData
    : {
        selectedLocale: DEFAULT_LOCALE,
        layout: null,
        notFoundCollection: undefined,
      };
  const {notFoundPage} = layout || {};

  let title = 'Error';
  if (isRouteError) {
    title = 'Not found';
  }

  return (
    <Document>
      <SiteLayout
        key={`${locale.language}-${locale.country}`}
        backgroundColor={notFoundPage?.colorTheme?.background}
      >
        {isRouteError ? (
          <>
            {routeError.status === 404 ? (
              <NotFound
                notFoundPage={notFoundPage}
                notFoundCollection={notFoundCollection}
              />
            ) : (
              <GenericError
                error={{message: `${routeError.status} ${routeError.data}`}}
              />
            )}
          </>
        ) : (
          <GenericError error={error instanceof Error ? error : undefined} />
        )}
      </SiteLayout>
    </Document>
  );
}

const SHOP_QUERY = `#graphql
  query layout {
    shop {
      id
      name
      description
    }
  }
`;
