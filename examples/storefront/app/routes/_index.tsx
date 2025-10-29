import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {defineQuery} from 'groq';
import {
  type EncodeDataAttributeFunction,
  Query,
  useImageUrlBuilder,
} from 'hydrogen-sanity';
import type {HOMEPAGE_QUERYResult} from 'sanity.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}, homepage] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
    context.sanity.query(HOMEPAGE_QUERY, undefined, {
      tag: 'homepage',
      hydrogen: {debug: {displayName: 'query Homepage'}},
    }),
  ]);

  return {
    featuredCollection: collections.nodes[0],
    homepage,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="home">
      <Query query={HOMEPAGE_QUERY} options={{initial: data.homepage}}>
        {(homepage, encodeDataAttribute) => (
          <>
            {/* Render Sanity homepage content when available */}
            {homepage && (
              <>
                {homepage.hero && (
                  <HeroSection
                    hero={homepage.hero}
                    encodeDataAttribute={encodeDataAttribute.scope(['hero'])}
                  />
                )}
                {homepage.modules && (
                  <ModulesSection
                    modules={homepage.modules}
                    encodeDataAttribute={encodeDataAttribute.scope(['modules'])}
                  />
                )}
              </>
            )}

            {/* Fallback to Shopify content when no Sanity homepage exists */}
            {!homepage && (
              <>
                <FeaturedCollection collection={data.featuredCollection} />
                <RecommendedProducts products={data.recommendedProducts} />
              </>
            )}

            {/* Always show recommended products at the bottom */}
            {homepage && (
              <RecommendedProducts products={data.recommendedProducts} />
            )}
          </>
        )}
      </Query>
    </div>
  );
}

function HeroSection({
  hero,
  encodeDataAttribute,
}: {
  hero: NonNullable<NonNullable<HOMEPAGE_QUERYResult>['hero']>;
  encodeDataAttribute: EncodeDataAttributeFunction;
}) {
  const imageUrlBuilder = useImageUrlBuilder();

  return (
    <section className="hero">
      {hero.title && <h1 className="hero-title">{hero.title}</h1>}
      {hero.description && (
        <p className="hero-description">{hero.description}</p>
      )}
      {hero.link?.[0] && (
        <div className="hero-link">
          {hero.link[0]._type === 'linkInternal' ? (
            <Link
              to={`/${hero.link[0].reference?.slug || ''}`}
              className="hero-button"
            >
              {hero.link[0].name}
            </Link>
          ) : (
            <a
              href={hero.link[0].url ?? undefined}
              className="hero-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              {hero.link[0].name}
            </a>
          )}
        </div>
      )}
      {hero.content && (
        <div className="hero-content">
          {hero.content.map((contentItem, index) => {
            switch (contentItem._type) {
              case 'productWithVariant':
                return (
                  contentItem.product && (
                    <div key={contentItem._key} className="hero-content-item">
                      <div className="hero-product">
                        <h3>Featured Product</h3>
                        {contentItem.product.store?.previewImageUrl && (
                          <img
                            src={contentItem.product.store.previewImageUrl}
                            alt={contentItem.product.store?.title || 'Product'}
                            style={{maxWidth: '200px', height: 'auto'}}
                          />
                        )}
                        <p>{contentItem.product.store?.title}</p>
                        {contentItem.product.store?.slug && (
                          <Link
                            to={`/products/${contentItem.product.store.slug}`}
                          >
                            View Product
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                );

              case 'imageWithProductHotspots':
                return (
                  contentItem.image && (
                    <div key={contentItem._key} className="hero-content-item">
                      <div className="hero-image">
                        <img
                          src={imageUrlBuilder
                            .image(contentItem.image)
                            .width(800)
                            .height(600)
                            .auto('format')
                            .url()}
                          alt={contentItem.image.alt || 'Hero image'}
                          style={{maxWidth: '100%', height: 'auto'}}
                          data-sanity={encodeDataAttribute([
                            'content',
                            {
                              _key: contentItem._key,
                              // @ts-expect-error without this it throw a runtime error
                              _index: index,
                            },
                            '_type',
                          ])}
                        />
                      </div>
                    </div>
                  )
                );

              default:
                return null;
            }
          })}
        </div>
      )}
    </section>
  );
}

function ModulesSection({
  modules,
  encodeDataAttribute,
}: {
  modules: NonNullable<NonNullable<HOMEPAGE_QUERYResult>['modules']>;
  encodeDataAttribute: EncodeDataAttributeFunction;
}) {
  const imageUrlBuilder = useImageUrlBuilder();

  return (
    <section className="modules">
      {modules.map((module, index) => {
        switch (module._type) {
          case 'callout':
            return (
              <div
                key={module._key}
                className={`module module-${module._type}`}
              >
                <div className="callout">
                  <p className="callout-text">{module.text}</p>
                  {module.link?.[0] && (
                    <div className="callout-link">
                      {module.link[0]._type === 'linkInternal' ? (
                        <Link
                          to={`/${module.link[0].reference?.slug || ''}`}
                          className="callout-button"
                        >
                          {module.link[0].name}
                        </Link>
                      ) : (
                        <a
                          href={module.link[0].url ?? undefined}
                          className="callout-button"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {module.link[0].name}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );

          case 'products':
            return (
              module.products && (
                <div
                  key={module._key}
                  className={`module module-${module._type}`}
                >
                  <div className="products-module">
                    <h2>Featured Products</h2>
                    <div
                      className={`products-grid layout-${module.layout || 'card'}`}
                    >
                      {module.products.map((product: any) => (
                        <div key={product._id} className="product-card">
                          {product.store?.previewImageUrl && (
                            <img
                              src={product.store.previewImageUrl}
                              alt={product.store?.title || 'Product'}
                              style={{
                                width: '100%',
                                aspectRatio: '1',
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          <h3>{product.store?.title}</h3>
                          {product.store?.slug && (
                            <Link to={`/products/${product.store.slug}`}>
                              View Product
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            );

          case 'imageWithProductHotspots':
            return (
              module.image && (
                <div
                  key={module._key}
                  className={`module module-${module._type}`}
                >
                  <div className="image-module">
                    <h2>Image Module</h2>
                    <img
                      src={imageUrlBuilder
                        .image(module.image)
                        .width(600)
                        .height(400)
                        .auto('format')
                        .url()}
                      alt={module.image.alt || 'Module image'}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                      }}
                      data-sanity={encodeDataAttribute([
                        'modules',
                        {
                          _key: module._key,
                          // @ts-expect-error without this it throw a runtime error
                          _index: index,
                        },
                        '_type',
                      ])}
                    />
                  </div>
                </div>
              )
            );

          default:
            return null;
        }
      })}
    </section>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </div>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;

const HOMEPAGE_QUERY = defineQuery(`
  *[_id == "home"][0]{
    _id,
    _rev,
    hero{
      title,
      description,
      link[]{
        _type,
        _type == "linkInternal" => {
          name,
          reference->{
            _type,
            slug
          }
        },
        _type == "linkExternal" => {
          name,
          url
        }
      },
      content[]{
        _type,
        _key,
        _type == "productWithVariant" => {
          product->{
            _id,
            store{
              title,
              slug,
              previewImageUrl
            }
          }
        },
        _type == "imageWithProductHotspots" => {
          image{
            asset->{
              _id,
              url
            },
            alt
          }
        }
      }
    },
    modules[]{
      _type,
      _key,
      _type == "callout" => {
        text,
        link[]{
          _type,
          _type == "linkInternal" => {
            name,
            reference->{
              _type,
              slug
            }
          },
          _type == "linkExternal" => {
            name,
            url
          }
        }
      },
      _type == "products" => {
        layout,
        products[]->{
          _id,
          store{
            title,
            slug,
            previewImageUrl
          }
        }
      },
      _type == "imageWithProductHotspots" => {
        image{
          asset->{
            _id,
            url
          },
          alt
        }
      }
    }
  }
`);
