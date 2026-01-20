import {useAsyncValue, useFetcher} from 'react-router';
import type {
  Collection,
  Product,
  ProductOption,
  ProductVariant,
} from '@shopify/hydrogen/storefront-api-types';
import pluralize from 'pluralize-esm';
import {useEffect, useMemo, useRef} from 'react';

import {countries} from '~/data/countries';
import type {
  SanityCollectionPage,
  SanityHomePage,
  SanityModule,
  SanityPage,
  SanityProductPage,
} from '~/lib/sanity';
import {usePreviewContext} from '~/lib/preview';
import {PRODUCTS_AND_COLLECTIONS} from '~/queries/shopify/product';
import type {I18nLocale, Storefront} from '~/types/shopify';
import {useRootLoaderData} from '~/root';

export const DEFAULT_LOCALE: I18nLocale = Object.freeze({
  ...countries.default,
  pathPrefix: '',
});

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart =
    '/' + url.pathname.substring(1).split('/')[0].toLowerCase();

  return countries[firstPathPart]
    ? {
        ...countries[firstPathPart],
        pathPrefix: firstPathPart,
      }
    : {
        ...countries['default'],
        pathPrefix: '',
      };
}

export function usePrefixPathWithLocale(path: string) {
  const selectedLocale = useRootLoaderData()?.selectedLocale ?? DEFAULT_LOCALE;

  return `${selectedLocale.pathPrefix}${
    path.startsWith('/') ? path : '/' + path
  }`;
}

export function validateLocale({
  params,
  context,
}: {
  context: {storefront: Storefront};
  params: {lang?: string};
}) {
  const {language, country} = context.storefront.i18n;
  if (
    params.lang &&
    params.lang.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    throw notFound();
  }
}

export function assertApiErrors(data: Record<string, any> | null | undefined) {
  const errorMessage = data?.customerUserErrors?.[0]?.message;
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export function statusMessage(status: string) {
  const translations: Record<string, string> = {
    ATTEMPTED_DELIVERY: 'Attempted delivery',
    CANCELED: 'Canceled',
    CONFIRMED: 'Confirmed',
    DELIVERED: 'Delivered',
    FAILURE: 'Failure',
    FULFILLED: 'Fulfilled',
    IN_PROGRESS: 'In Progress',
    IN_TRANSIT: 'In transit',
    LABEL_PRINTED: 'Label printed',
    LABEL_PURCHASED: 'Label purchased',
    LABEL_VOIDED: 'Label voided',
    MARKED_AS_FULFILLED: 'Marked as fulfilled',
    NOT_DELIVERED: 'Not delivered',
    ON_HOLD: 'On Hold',
    OPEN: 'Open',
    OUT_FOR_DELIVERY: 'Out for delivery',
    PARTIALLY_FULFILLED: 'Partially Fulfilled',
    PENDING_FULFILLMENT: 'Pending',
    PICKED_UP: 'Displayed as Picked up',
    READY_FOR_PICKUP: 'Ready for pickup',
    RESTOCKED: 'Restocked',
    SCHEDULED: 'Scheduled',
    SUBMITTED: 'Submitted',
    UNFULFILLED: 'Unfulfilled',
  };
  try {
    return translations?.[status];
  } catch (error) {
    return status;
  }
}

const MODULE_INTERVAL = 2;
const START_INDEX = 2;

export function combineProductsAndModules({
  modules,
  products,
}: {
  products: Product[];
  modules?: SanityModule[];
}) {
  let moduleIndex = 0;
  return products.reduce<(SanityModule | Product)[]>((acc, val, index) => {
    if (index >= START_INDEX && index % MODULE_INTERVAL === 0) {
      const nextModule = modules?.[moduleIndex];
      if (nextModule) {
        acc.push(nextModule);
        moduleIndex += 1;
      }
    }
    acc.push(val);
    return acc;
  }, []);
}

export const hasMultipleProductOptions = (options?: ProductOption[]) => {
  const firstOption = options?.[0];
  if (!firstOption) {
    return false;
  }

  return (
    firstOption.name !== 'Title' && firstOption.values[0] !== 'Default Title'
  );
};

export const getProductOptionString = (options?: ProductOption[]) => {
  return options
    ?.map(({name, values}) => pluralize(name, values.length, true))
    .join(' / ');
};

type StorefrontPayload = {
  productsAndCollections: Product[] | Collection[];
};

function collectGidsByType(value: unknown, type: string, result: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectGidsByType(item, type, result));
    return result;
  }

  if (!value || typeof value !== 'object') {
    return result;
  }

  const record = value as Record<string, unknown>;
  if (record._type === type && typeof record.gid === 'string') {
    result.push(record.gid);
  }

  Object.values(record).forEach((item) => collectGidsByType(item, type, result));
  return result;
}

export function extractIds(
  value: unknown,
  result: Array<Product | Collection | ProductVariant> = [],
) {
  if (Array.isArray(value)) {
    value.forEach((item) => extractIds(item, result));
    return result;
  }

  if (!value || typeof value !== 'object') {
    return result;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string') {
    result.push(record as Product | Collection | ProductVariant);
  }

  Object.values(record).forEach((item) => extractIds(item, result));
  return result;
}

export async function fetchGids({
  page,
  context,
}: {
  page: SanityHomePage | SanityPage | SanityCollectionPage | SanityProductPage;
  context: {storefront: Storefront};
}) {
  const productGids = collectGidsByType(page, 'productWithVariant');
  const collectionGids = collectGidsByType(page, 'collection');

  const {productsAndCollections} =
    await context.storefront.query<StorefrontPayload>(
      PRODUCTS_AND_COLLECTIONS,
      {
        variables: {
          ids: [...productGids, ...collectionGids],
        },
      },
    );

  return extractIds(productsAndCollections);
}

export function useGid<
  T extends Product | Collection | ProductVariant | ProductVariant['image'],
>(id?: string | null): T | null | undefined {
  const gids = useRef(useGids());
  const fetcher = useFetcher();
  const isPreview = Boolean(usePreviewContext());
  const {selectedLocale} = useRootLoaderData();

  const gid = useRef(gids.current.get(id as string) as T | null);

  useEffect(() => {
    if (isPreview && !gid.current && id) {
      const apiUrl = `${
        selectedLocale && `${selectedLocale.pathPrefix}`
      }/api/fetchgids`;
      if (fetcher.state === 'idle' && fetcher.data == null) {
        fetcher.submit(
          {ids: JSON.stringify([id])},
          {method: 'post', action: apiUrl},
        );
      }

      if (fetcher.data) {
        const newGids = fetcher.data as (
          | Product
          | Collection
          | ProductVariant
        )[];

        if (!Array.isArray(newGids)) {
          return;
        }

        for (const newGid of newGids) {
          if (gids.current.has(newGid.id)) {
            continue;
          }

          gids.current.set(newGid.id, newGid);
        }

        gid.current = gids.current.get(id as string) as T | null;
      }
    }
  }, [gids, id, isPreview, fetcher, selectedLocale]);

  return gid.current;
}

export function useGids() {
  const gids = useAsyncValue();

  return useMemo(() => {
    const byGid = new Map<
      string,
      Product | Collection | ProductVariant | ProductVariant['image']
    >();

    if (!Array.isArray(gids)) {
      return byGid;
    }

    for (const gid of gids) {
      if (byGid.has(gid.id)) {
        continue;
      }

      byGid.set(gid.id, gid);
    }

    return byGid;
  }, [gids]);
}

export const notFound = (message = 'Not Found') =>
  new Response(message, {
    status: 404,
    statusText: 'Not Found',
  });

export const badRequest = <T>(data: T) =>
  Response.json(data, {status: 400, statusText: 'Bad Request'});

export function isLocalPath(request: Request, url: string) {
  const currentUrl = new URL(request.url);
  const urlToCheck = new URL(url, currentUrl.origin);
  return currentUrl.origin === urlToCheck.origin;
}
