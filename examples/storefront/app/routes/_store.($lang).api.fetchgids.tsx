import type {
  Collection,
  Product,
  ProductVariant,
} from '@shopify/hydrogen/storefront-api-types';
import {json} from 'react-router';

import {extractIds, notFound, validateLocale} from '~/lib/utils';
import {PRODUCTS_AND_COLLECTIONS} from '~/queries/shopify/product';
import type {Route} from './+types/_store.($lang).api.fetchgids';

type StorefrontPayload = {
  productsAndCollections: Product[] | Collection[];
};

export async function action({params, context, request}: Route.ActionArgs) {
  const isPreview = Boolean(context.sanity.preview?.enabled);

  if (!isPreview) {
    throw notFound();
  }

  validateLocale({context, params});
  const formData = await request.formData();
  const ids = formData.get('ids') as string;

  const {productsAndCollections} =
    await context.storefront.query<StorefrontPayload>(
      PRODUCTS_AND_COLLECTIONS,
      {
        variables: {
          ids: ids ? JSON.parse(ids) : [],
        },
      },
    );

  return json(extractIds(productsAndCollections));
}

export function loader() {
  throw notFound();
}

export default function FetchGids() {
  return <></>;
}
