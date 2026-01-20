/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type CartMoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
};

export type CartLineComponentFragment = Pick<
  StorefrontAPI.ComponentizableCartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'updatedAt' | 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  appliedGiftCards: Array<
    Pick<StorefrontAPI.AppliedGiftCard, 'id' | 'lastCharacters'> & {
      amountUsed: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    }
  >;
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
        })
      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
        })
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type FooterQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type CollectionFieldsFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'description' | 'handle'
> & {
  products: {
    pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage' | 'endCursor'>;
    nodes: Array<
      Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'availableForSale' | 'id' | 'title' | 'sku'
            > & {
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
              >;
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'altText' | 'height' | 'id' | 'url' | 'width'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              unitPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
            }
          >;
        };
        options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
      }
    >;
  };
};

export type CollectionDetailsByHandleQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  count: StorefrontAPI.Scalars['Int']['input'];
  cursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type CollectionDetailsByHandleQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'title' | 'description' | 'handle'
    > & {
      products: {
        pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage' | 'endCursor'>;
        nodes: Array<
          Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
            variants: {
              nodes: Array<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'availableForSale' | 'id' | 'title' | 'sku'
                > & {
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                  >;
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'altText' | 'height' | 'id' | 'url' | 'width'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  unitPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
                }
              >;
            };
            options: Array<
              Pick<StorefrontAPI.ProductOption, 'name' | 'values'>
            >;
          }
        >;
      };
    }
  >;
};

export type CollectionDetailsByIdQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  id: StorefrontAPI.Scalars['ID']['input'];
  count: StorefrontAPI.Scalars['Int']['input'];
  cursor?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type CollectionDetailsByIdQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'title' | 'description' | 'handle'
    > & {
      products: {
        pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage' | 'endCursor'>;
        nodes: Array<
          Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
            variants: {
              nodes: Array<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'availableForSale' | 'id' | 'title' | 'sku'
                > & {
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                  >;
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'altText' | 'height' | 'id' | 'url' | 'width'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  unitPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
                }
              >;
            };
            options: Array<
              Pick<StorefrontAPI.ProductOption, 'name' | 'values'>
            >;
          }
        >;
      };
    }
  >;
};

export type ProductVariantFieldsFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'title' | 'sku'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
  >;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'url' | 'width'>
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
};

export type ProductFieldsFragment = Pick<
  StorefrontAPI.Product,
  'handle' | 'id' | 'title' | 'vendor'
> & {options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>};

export type ProductByHandleQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type ProductByHandleQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
      media: {
        nodes: Array<
          | (Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
            })
          | (Pick<StorefrontAPI.Model3d, 'id' | 'mediaContentType'> & {
              sources: Array<
                Pick<StorefrontAPI.Model3dSource, 'mimeType' | 'url'>
              >;
            })
        >;
      };
      selectedVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'title' | 'sku'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'altText' | 'height' | 'id' | 'url' | 'width'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        }
      >;
      variants: {
        nodes: Array<
          Pick<
            StorefrontAPI.ProductVariant,
            'availableForSale' | 'id' | 'title' | 'sku'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'altText' | 'height' | 'id' | 'url' | 'width'
              >
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
            unitPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          }
        >;
      };
      options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
    }
  >;
};

export type ProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
  variantIds:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductsQuery = {
  products: Array<
    StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
        options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
      }
    >
  >;
  productVariants: Array<
    StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.ProductVariant,
        'availableForSale' | 'id' | 'title' | 'sku'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'altText' | 'height' | 'id' | 'url' | 'width'
          >
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
        unitPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
      }
    >
  >;
};

export type ProductByIdAndVariantQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  id: StorefrontAPI.Scalars['ID']['input'];
  variantId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductByIdAndVariantQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
      options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
    }
  >;
  productVariant?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'title' | 'sku'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
      >;
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'url' | 'width'>
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
    }
  >;
};

export type ProductsAndCollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductsAndCollectionsQuery = {
  productsAndCollections: Array<
    StorefrontAPI.Maybe<
      | Pick<
          StorefrontAPI.Collection,
          'id' | 'title' | 'description' | 'handle'
        >
      | (Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
          variants: {
            nodes: Array<
              Pick<
                StorefrontAPI.ProductVariant,
                'availableForSale' | 'id' | 'title' | 'sku'
              > & {
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'altText' | 'height' | 'id' | 'url' | 'width'
                  >
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
                unitPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
              }
            >;
          };
          options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
        })
    >
  >;
};

export type VariantsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type VariantsQuery = {
  product?: StorefrontAPI.Maybe<{
    variants: {
      nodes: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'title' | 'sku'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'altText' | 'height' | 'id' | 'url' | 'width'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
        }
      >;
    };
  }>;
};

export type ProductRecommendationsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  productId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type ProductRecommendationsQuery = {
  productRecommendations?: StorefrontAPI.Maybe<
    Array<
      Pick<StorefrontAPI.Product, 'handle' | 'id' | 'title' | 'vendor'> & {
        variants: {
          nodes: Array<
            Pick<
              StorefrontAPI.ProductVariant,
              'availableForSale' | 'id' | 'title' | 'sku'
            > & {
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
              >;
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'altText' | 'height' | 'id' | 'url' | 'width'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              unitPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
            }
          >;
        };
        options: Array<Pick<StorefrontAPI.ProductOption, 'name' | 'values'>>;
      }
    >
  >;
};

export type LayoutQueryVariables = StorefrontAPI.Exact<{[key: string]: never}>;

export type LayoutQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'>;
};

export type CustomerActivateMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
  input: StorefrontAPI.CustomerActivateInput;
}>;

export type CustomerActivateMutation = {
  customerActivate?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressUpdateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  id: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressDeleteMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  id: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.CustomerAddressDeletePayload,
      'deletedCustomerAddressId'
    > & {
      customerUserErrors: Array<
        Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
      >;
    }
  >;
};

export type CustomerDefaultAddressUpdateMutationVariables =
  StorefrontAPI.Exact<{
    addressId: StorefrontAPI.Scalars['ID']['input'];
    customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  }>;

export type CustomerDefaultAddressUpdateMutation = {
  customerDefaultAddressUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAddressCreateMutationVariables = StorefrontAPI.Exact<{
  address: StorefrontAPI.MailingAddressInput;
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: StorefrontAPI.Maybe<{
    customerAddress?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MailingAddress, 'id'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerUpdateMutationVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  customer: StorefrontAPI.CustomerUpdateInput;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerAccessTokenCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerAccessTokenCreateInput;
}>;

export type CustomerAccessTokenCreateMutation = {
  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
  }>;
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'amount' | 'currencyCode'
>;

export type AddressFullFragment = Pick<
  StorefrontAPI.MailingAddress,
  | 'address1'
  | 'address2'
  | 'city'
  | 'company'
  | 'country'
  | 'countryCodeV2'
  | 'firstName'
  | 'formatted'
  | 'id'
  | 'lastName'
  | 'name'
  | 'phone'
  | 'province'
  | 'provinceCode'
  | 'zip'
>;

export type DiscountApplicationFragment = {
  value:
    | Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
    | Pick<StorefrontAPI.PricingPercentageValue, 'percentage'>;
};

export type ImageFragment = Pick<
  StorefrontAPI.Image,
  'altText' | 'height' | 'id' | 'width'
> & {url: StorefrontAPI.Image['url']};

export type ProductVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'id' | 'sku' | 'title'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
      url: StorefrontAPI.Image['url'];
    }
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'handle'>;
};

export type LineItemFullFragment = Pick<
  StorefrontAPI.OrderLineItem,
  'title' | 'quantity'
> & {
  discountAllocations: Array<{
    allocatedAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
    discountApplication: {
      value:
        | Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
        | Pick<StorefrontAPI.PricingPercentageValue, 'percentage'>;
    };
  }>;
  originalTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  discountedTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  variant?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'altText' | 'height' | 'id' | 'width'> & {
          url: StorefrontAPI.Image['url'];
        }
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'handle'>;
    }
  >;
};

export type CustomerOrderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  orderId: StorefrontAPI.Scalars['ID']['input'];
}>;

export type CustomerOrderQuery = {
  node?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Order,
      'id' | 'name' | 'orderNumber' | 'processedAt' | 'fulfillmentStatus'
    > & {
      totalTax?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      totalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      subtotalPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      shippingAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'address1'
          | 'address2'
          | 'city'
          | 'company'
          | 'country'
          | 'countryCodeV2'
          | 'firstName'
          | 'formatted'
          | 'id'
          | 'lastName'
          | 'name'
          | 'phone'
          | 'province'
          | 'provinceCode'
          | 'zip'
        >
      >;
      discountApplications: {
        nodes: Array<{
          value:
            | Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
            | Pick<StorefrontAPI.PricingPercentageValue, 'percentage'>;
        }>;
      };
      lineItems: {
        nodes: Array<
          Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
            discountAllocations: Array<{
              allocatedAmount: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              discountApplication: {
                value:
                  | Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  | Pick<StorefrontAPI.PricingPercentageValue, 'percentage'>;
              };
            }>;
            originalTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            discountedTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            variant?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'altText' | 'height' | 'id' | 'width'
                  > & {url: StorefrontAPI.Image['url']}
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                product: Pick<StorefrontAPI.Product, 'handle'>;
              }
            >;
          }
        >;
      };
    }
  >;
};

export type CustomerRecoverMutationVariables = StorefrontAPI.Exact<{
  email: StorefrontAPI.Scalars['String']['input'];
}>;

export type CustomerRecoverMutation = {
  customerRecover?: StorefrontAPI.Maybe<{
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerCreateInput;
}>;

export type CustomerCreateMutation = {
  customerCreate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerResetMutationVariables = StorefrontAPI.Exact<{
  id: StorefrontAPI.Scalars['ID']['input'];
  input: StorefrontAPI.CustomerResetInput;
}>;

export type CustomerResetMutation = {
  customerReset?: StorefrontAPI.Maybe<{
    customerAccessToken?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
    >;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type CustomerDetailsQueryVariables = StorefrontAPI.Exact<{
  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Customer,
      'firstName' | 'lastName' | 'phone' | 'email'
    > & {
      defaultAddress?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.MailingAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'country'
          | 'province'
          | 'city'
          | 'zip'
          | 'phone'
        >
      >;
      addresses: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.MailingAddress,
            | 'id'
            | 'formatted'
            | 'firstName'
            | 'lastName'
            | 'company'
            | 'address1'
            | 'address2'
            | 'country'
            | 'province'
            | 'city'
            | 'zip'
            | 'phone'
          >;
        }>;
      };
      orders: {
        edges: Array<{
          node: Pick<
            StorefrontAPI.Order,
            | 'id'
            | 'orderNumber'
            | 'processedAt'
            | 'financialStatus'
            | 'fulfillmentStatus'
          > & {
            currentTotalPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            lineItems: {
              edges: Array<{
                node: Pick<StorefrontAPI.OrderLineItem, 'title'> & {
                  variant?: StorefrontAPI.Maybe<{
                    image?: StorefrontAPI.Maybe<
                      Pick<
                        StorefrontAPI.Image,
                        'url' | 'altText' | 'height' | 'width'
                      >
                    >;
                  }>;
                };
              }>;
            };
          };
        }>;
      };
    }
  >;
};

interface GeneratedQueryTypes {
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  query Footer(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: FooterQuery;
    variables: FooterQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n  #graphql\n  fragment CollectionFields on Collection {\n    id\n    title\n    description\n    handle\n    products(first: $count, after: $cursor, sortKey: $sortKey, reverse: $reverse) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        ...ProductFields\n        variants(first: 1) {\n          nodes {\n            ...ProductVariantFields\n          }\n        }\n      }\n    }\n  }\n\n\n  query CollectionDetailsByHandle($country: CountryCode, $language: LanguageCode, $handle: String!, $count: Int!, $cursor: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean)\n    @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      ...CollectionFields\n    }\n  }\n': {
    return: CollectionDetailsByHandleQuery;
    variables: CollectionDetailsByHandleQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n  #graphql\n  fragment CollectionFields on Collection {\n    id\n    title\n    description\n    handle\n    products(first: $count, after: $cursor, sortKey: $sortKey, reverse: $reverse) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        ...ProductFields\n        variants(first: 1) {\n          nodes {\n            ...ProductVariantFields\n          }\n        }\n      }\n    }\n  }\n\n\n  query CollectionDetailsById($country: CountryCode, $language: LanguageCode, $id: ID!, $count: Int!, $cursor: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean)\n    @inContext(country: $country, language: $language) {\n    collection(id: $id) {\n      ...CollectionFields\n    }\n  }\n': {
    return: CollectionDetailsByIdQuery;
    variables: CollectionDetailsByIdQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query ProductByHandle($country: CountryCode, $language: LanguageCode, $handle: String!, $selectedOptions: [SelectedOptionInput!]!)\n  @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...ProductFields\n      media(first: 20) {\n        nodes {\n          ... on MediaImage {\n            id\n            mediaContentType\n            image {\n              id\n              url\n              altText\n              width\n              height\n            }\n          }\n          ... on Model3d {\n            id\n            mediaContentType\n            sources {\n              mimeType\n              url\n            }\n          }\n        }\n      }\n      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {\n        ...ProductVariantFields\n      }\n      variants(first: 1) {\n        nodes {\n          ...ProductVariantFields\n        }\n      }\n    }\n  }\n': {
    return: ProductByHandleQuery;
    variables: ProductByHandleQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query products(\n    $country: CountryCode\n    $language: LanguageCode\n    $ids: [ID!]!\n    $variantIds: [ID!]!\n  ) @inContext(country: $country, language: $language) {\n    products: nodes(ids: $ids) {\n      ... on Product {\n        ...ProductFields\n      }\n    }\n    productVariants: nodes(ids: $variantIds) {\n      ... on ProductVariant {\n        ...ProductVariantFields\n      }\n    }\n  }\n': {
    return: ProductsQuery;
    variables: ProductsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query ProductByIdAndVariant(\n    $country: CountryCode\n    $language: LanguageCode\n    $id: ID!\n    $variantId: ID!\n  ) @inContext(country: $country, language: $language) {\n    product: product(id: $id) {\n      ...ProductFields\n    }\n    productVariant: node(id: $variantId) {\n      ... on ProductVariant {\n        ...ProductVariantFields\n      }\n    }\n  }\n': {
    return: ProductByIdAndVariantQuery;
    variables: ProductByIdAndVariantQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query productsAndCollections(\n    $country: CountryCode\n    $language: LanguageCode\n    $ids: [ID!]!\n  ) @inContext(country: $country, language: $language) {\n    productsAndCollections: nodes(ids: $ids) {\n      ... on Product {\n        ...ProductFields\n        variants(first: 250) {\n          nodes {\n            ...ProductVariantFields\n          }\n        }\n      }\n      ... on Collection {\n        id\n        title\n        description\n        handle\n      }\n    }\n  }\n': {
    return: ProductsAndCollectionsQuery;
    variables: ProductsAndCollectionsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query variants(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: String!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      variants(first: 250) {\n        nodes {\n          ...ProductVariantFields\n        }\n      }\n    }\n  }\n': {
    return: VariantsQuery;
    variables: VariantsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductFields on Product {\n    handle\n    id\n    options {\n      name\n      values\n    }\n    title\n    vendor\n  }\n\n  #graphql\n  fragment ProductVariantFields on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      currencyCode\n      amount\n    }\n    id\n    image {\n      altText\n      height\n      id\n      url\n      width\n    }\n    price {\n      currencyCode\n      amount\n    }\n    selectedOptions {\n      name\n      value\n    }\n    title\n    sku\n    unitPrice {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n  }\n\n\n  query productRecommendations(\n    $country: CountryCode\n    $language: LanguageCode\n    $productId: ID!\n  ) @inContext(country: $country, language: $language) {\n    productRecommendations(productId: $productId) {\n      ...ProductFields\n      variants(first: 1) {\n        nodes {\n          ...ProductVariantFields\n        }\n      }\n    }\n  }\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  query layout {\n    shop {\n      id\n      name\n      description\n    }\n  }\n': {
    return: LayoutQuery;
    variables: LayoutQueryVariables;
  };
  '#graphql\n  fragment Money on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment AddressFull on MailingAddress {\n    address1\n    address2\n    city\n    company\n    country\n    countryCodeV2\n    firstName\n    formatted\n    id\n    lastName\n    name\n    phone\n    province\n    provinceCode\n    zip\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      ... on MoneyV2 {\n        amount\n        currencyCode\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment Image on Image {\n    altText\n    height\n    url: url(transform: {crop: CENTER, maxHeight: 96, maxWidth: 96, scale: 2})\n    id\n    width\n  }\n  fragment ProductVariant on ProductVariant {\n    id\n    image {\n      ...Image\n    }\n    price {\n      ...Money\n    }\n    product {\n      handle\n    }\n    sku\n    title\n  }\n  fragment LineItemFull on OrderLineItem {\n    title\n    quantity\n    discountAllocations {\n      allocatedAmount {\n        ...Money\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    originalTotalPrice {\n      ...Money\n    }\n    discountedTotalPrice {\n      ...Money\n    }\n    variant {\n      ...ProductVariant\n    }\n  }\n\n  query CustomerOrder(\n    $country: CountryCode\n    $language: LanguageCode\n    $orderId: ID!\n  ) @inContext(country: $country, language: $language) {\n    node(id: $orderId) {\n      ... on Order {\n        id\n        name\n        orderNumber\n        processedAt\n        fulfillmentStatus\n        totalTax {\n          ...Money\n        }\n        totalPrice {\n          ...Money\n        }\n        subtotalPrice {\n          ...Money\n        }\n        shippingAddress {\n          ...AddressFull\n        }\n        discountApplications(first: 100) {\n          nodes {\n            ...DiscountApplication\n          }\n        }\n        lineItems(first: 100) {\n          nodes {\n            ...LineItemFull\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerOrderQuery;
    variables: CustomerOrderQueryVariables;
  };
  '#graphql\n  query CustomerDetails(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      firstName\n      lastName\n      phone\n      email\n      defaultAddress {\n        id\n        formatted\n        firstName\n        lastName\n        company\n        address1\n        address2\n        country\n        province\n        city\n        zip\n        phone\n      }\n      addresses(first: 6) {\n        edges {\n          node {\n            id\n            formatted\n            firstName\n            lastName\n            company\n            address1\n            address2\n            country\n            province\n            city\n            zip\n            phone\n          }\n        }\n      }\n      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {\n        edges {\n          node {\n            id\n            orderNumber\n            processedAt\n            financialStatus\n            fulfillmentStatus\n            currentTotalPrice {\n              amount\n              currencyCode\n            }\n            lineItems(first: 100) {\n              edges {\n                node {\n                  variant {\n                    image {\n                      url\n                      altText\n                      height\n                      width\n                    }\n                  }\n                  title\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerActivateMutation;
    variables: CustomerActivateMutationVariables;
  };
  '#graphql\n  mutation customerAddressUpdate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n    $id: ID!\n  ) {\n    customerAddressUpdate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n      id: $id\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {\n    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      deletedCustomerAddressId\n    }\n  }\n': {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  '#graphql\n  mutation customerDefaultAddressUpdate(\n    $addressId: ID!\n    $customerAccessToken: String!\n  ) {\n    customerDefaultAddressUpdate(\n      addressId: $addressId\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerDefaultAddressUpdateMutation;
    variables: CustomerDefaultAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressCreate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n  ) {\n    customerAddressCreate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerAddress {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  '#graphql\n  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n  ': {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
    return: CustomerAccessTokenCreateMutation;
    variables: CustomerAccessTokenCreateMutationVariables;
  };
  '#graphql\n  mutation customerRecover($email: String!) {\n    customerRecover(email: $email) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerRecoverMutation;
    variables: CustomerRecoverMutationVariables;
  };
  '#graphql\n  mutation customerCreate($input: CustomerCreateInput!) {\n    customerCreate(input: $input) {\n      customer {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerCreateMutation;
    variables: CustomerCreateMutationVariables;
  };
  '#graphql\n  mutation customerReset($id: ID!, $input: CustomerResetInput!) {\n    customerReset(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerResetMutation;
    variables: CustomerResetMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
