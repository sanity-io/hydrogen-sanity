import {Money, ShopifyAnalyticsPayload} from '@shopify/hydrogen';
import {Product, ProductVariant} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';

import ProductForm from '~/components/product/Form';
import type {SanityProductPage} from '~/lib/sanity';

type Props = {
  sanityProduct: SanityProductPage;
  storefrontProduct: Product;
  storefrontVariants: ProductVariant[];
  selectedVariant: ProductVariant;
  analytics: ShopifyAnalyticsPayload;
};

function ProductPrices({
  storefrontProduct,
  selectedVariant,
}: {
  storefrontProduct: Product;
  selectedVariant: ProductVariant;
}) {
  if (!storefrontProduct || !selectedVariant) {
    return null;
  }

  return (
    <div className="mt-2 flex text-md font-bold">
      {selectedVariant.compareAtPrice && (
        <span className="mr-3 text-darkGray line-through decoration-red">
          <Money data={selectedVariant.compareAtPrice} />
        </span>
      )}
      {selectedVariant.price && <Money data={selectedVariant.price} />}
    </div>
  );
}

export default function ProductWidget({
  sanityProduct,
  storefrontProduct,
  storefrontVariants,
  selectedVariant,
  analytics,
}: Props) {
  const availableForSale = selectedVariant?.availableForSale;

  if (!selectedVariant) {
    return null;
  }

  return (
    <div
      className={clsx(
        'pointer-events-auto z-10 ml-auto rounded bg-white px-4 py-6 shadow',
        'md:px-6',
      )}
    >
      {!availableForSale && (
        <div className="mb-3 text-xs font-bold uppercase text-darkGray">
          Sold out
        </div>
      )}

      {availableForSale && selectedVariant?.compareAtPrice && (
        <div className="mb-3 text-xs font-bold uppercase text-red">Sale</div>
      )}

      {storefrontProduct?.title && (
        <h1 className="text-md font-bold uppercase">
          {storefrontProduct.title}
        </h1>
      )}

      {storefrontProduct?.vendor && (
        <div className="mt-1 text-md text-darkGray">
          {storefrontProduct.vendor}
        </div>
      )}

      <ProductPrices
        storefrontProduct={storefrontProduct}
        selectedVariant={selectedVariant}
      />

      <div className="my-4 w-full border-b border-gray" />

      <ProductForm
        product={storefrontProduct}
        variants={storefrontVariants}
        selectedVariant={selectedVariant}
        analytics={analytics}
        customProductOptions={sanityProduct.customProductOptions}
      />
    </div>
  );
}
