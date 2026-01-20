import {
  PRODUCT_FIELDS,
  PRODUCT_VARIANT_FIELDS,
} from '~/queries/shopify/product';

export const COLLECTION_FIELDS = `#graphql
  fragment CollectionFields on Collection {
    id
    title
    description
    handle
    products(first: $count, after: $cursor, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductFields
        variants(first: 1) {
          nodes {
            ...ProductVariantFields
          }
        }
      }
    }
  }
`;

export const COLLECTION_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  ${PRODUCT_VARIANT_FIELDS}
  ${COLLECTION_FIELDS}

  query CollectionDetailsByHandle($country: CountryCode, $language: LanguageCode, $handle: String!, $count: Int!, $cursor: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean)
    @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CollectionFields
    }
  }
`;

export const COLLECTION_QUERY_ID = `#graphql
  ${PRODUCT_FIELDS}
  ${PRODUCT_VARIANT_FIELDS}
  ${COLLECTION_FIELDS}

  query CollectionDetailsById($country: CountryCode, $language: LanguageCode, $id: ID!, $count: Int!, $cursor: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean)
    @inContext(country: $country, language: $language) {
    collection(id: $id) {
      ...CollectionFields
    }
  }
`;
