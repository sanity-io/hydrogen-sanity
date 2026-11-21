import { defineQuery } from "groq";
import {
  type EncodeDataAttributeFunction,
  Image as SanityImage,
  isImageWithAsset,
} from "hydrogen-sanity";
import { Link } from "react-router";

import type { HOMEPAGE_QUERY_RESULT } from "../../sanity.generated";

export const HOMEPAGE_QUERY = defineQuery(`
  fn image::asset($asset) = $asset->{_id, url, metadata{lqip}};
  fn image::field($image) = $image{crop, hotspot, "asset": image::asset(asset)};

  *[_id == "home"][0]{
    _id,
    _rev,
    hero{
      title,
      description,
      link[]{
        _type,
        _type == "linkInternal" => {
          reference->{
            _type,
            _type == "page" => {
              title,
              slug
            },
            _type == "product" => {
              store{
                title,
                slug
              }
            },
            _type == "collection" => {
              store{
                title,
                slug
              }
            }
          }
        },
        _type == "linkExternal" => {
          url,
          newWindow
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
          "image": image::field(image)
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
            reference->{
              _type,
              _type == "page" => {
                title,
                slug
              },
              _type == "product" => {
                store{
                  title,
                  slug
                }
              },
              _type == "collection" => {
                store{
                  title,
                  slug
                }
              }
            }
          },
          _type == "linkExternal" => {
            url,
            newWindow
          }
        }
      },
      _type == "products" => {
        layout,
        products[]{
          _key,
          productWithVariant{
            product->{
              _id,
              store{
                title,
                slug,
                previewImageUrl
              }
            }
          }
        }
      },
      _type == "imageWithProductHotspots" => {
        "image": image::field(image)
      }
    }
  }
`);

type Homepage = NonNullable<HOMEPAGE_QUERY_RESULT>;
type Hero = NonNullable<Homepage["hero"]>;
type Modules = NonNullable<Homepage["modules"]>;
type HomepageLink = NonNullable<Hero["link"]>[number];
type InternalLinkReference = NonNullable<
  Extract<HomepageLink, { _type: "linkInternal" }>["reference"]
>;

const buttonClassName =
  "bg-interactive text-interactive-text inline-flex min-h-touch-target items-center rounded px-4 no-underline";

function internalLinkPath(reference: InternalLinkReference) {
  switch (reference._type) {
    case "page":
      return reference.slug?.current ? `/pages/${reference.slug.current}` : "/";
    case "product":
      return reference.store?.slug?.current ? `/products/${reference.store.slug.current}` : "/";
    case "collection":
      return reference.store?.slug?.current ? `/collections/${reference.store.slug.current}` : "/";
    default:
      return "/";
  }
}

function internalLinkLabel(reference: InternalLinkReference) {
  switch (reference._type) {
    case "page":
      return reference.title ?? "Untitled";
    case "product":
    case "collection":
      return reference.store?.title ?? "Untitled";
    default:
      return "Home";
  }
}

/**
 * `linkInternal` and `linkExternal` carry no label of their own, so internal
 * links borrow the title of whatever they reference and external links show
 * their URL.
 */
function ContentLink({ link }: { link: HomepageLink }) {
  if (link._type === "linkInternal") {
    if (!link.reference) return null;

    return (
      <Link to={internalLinkPath(link.reference)} className={buttonClassName}>
        {internalLinkLabel(link.reference)}
      </Link>
    );
  }

  return (
    <a
      href={link.url ?? undefined}
      className={buttonClassName}
      target={link.newWindow ? "_blank" : undefined}
      rel={link.newWindow ? "noopener noreferrer" : undefined}
    >
      {link.url}
    </a>
  );
}

type ProductStore = {
  title?: string | null;
  slug?: { current?: string | null } | null;
  previewImageUrl?: string | null;
} | null;

function ProductTeaser({ store }: { store: ProductStore }) {
  return (
    <div className="flex flex-col gap-2">
      {store?.previewImageUrl ? (
        <img
          src={store.previewImageUrl}
          alt={store.title || "Product"}
          className="aspect-square w-full object-cover"
        />
      ) : null}
      <h3 className="type-heading-sm">{store?.title}</h3>
      {store?.slug?.current ? <Link to={`/products/${store.slug.current}`}>View product</Link> : null}
    </div>
  );
}

function HeroSection({
  hero,
  encodeDataAttribute,
}: {
  hero: Hero;
  encodeDataAttribute: EncodeDataAttributeFunction;
}) {
  return (
    <section className="max-w-page px-margin mx-auto flex w-full flex-col gap-6 py-16">
      {hero.title ? <h1 className="type-display">{hero.title}</h1> : null}
      {hero.description ? (
        <p className="text-on-surface-secondary max-w-prose">{hero.description}</p>
      ) : null}
      {hero.link?.[0] ? (
        <div>
          <ContentLink link={hero.link[0]} />
        </div>
      ) : null}
      {hero.content?.map((contentItem, index) => {
        switch (contentItem._type) {
          case "productWithVariant":
            return contentItem.product ? (
              <div key={contentItem._key} className="max-w-xs">
                <ProductTeaser store={contentItem.product.store} />
              </div>
            ) : null;

          case "imageWithProductHotspots":
            return isImageWithAsset(contentItem.image) ? (
              <SanityImage
                key={contentItem._key}
                src={contentItem.image}
                aspectRatio="4/3"
                sizes="(min-width: 800px) 800px, 100vw"
                placeholder="blur"
                loading="eager"
                className="w-full max-w-3xl"
                data-sanity={encodeDataAttribute([
                  "content",
                  {
                    _key: contentItem._key,
                    // `_index` is absent from `KeyedSegment` but required at runtime:
                    // resolving the source map throws on a keyed segment left at -1
                    // @ts-expect-error -- see above
                    _index: index,
                  },
                  "_type",
                ])}
              />
            ) : null;

          default:
            return null;
        }
      })}
    </section>
  );
}

function ModulesSection({
  modules,
  encodeDataAttribute,
}: {
  modules: Modules;
  encodeDataAttribute: EncodeDataAttributeFunction;
}) {
  return (
    <section className="max-w-page px-margin mx-auto flex w-full flex-col gap-12 py-12">
      {modules.map((module, index) => {
        switch (module._type) {
          case "callout":
            return (
              <div key={module._key} className="flex flex-col items-start gap-4">
                <p className="type-heading-xl">{module.text}</p>
                {module.link?.[0] ? <ContentLink link={module.link[0]} /> : null}
              </div>
            );

          case "products":
            return module.products ? (
              <div key={module._key} className="flex flex-col gap-4">
                <h2 className="type-heading-xl">Featured products</h2>
                <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {module.products.map(({ _key, productWithVariant }) =>
                    productWithVariant?.product ? (
                      <li key={_key}>
                        <ProductTeaser store={productWithVariant.product.store} />
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : null;

          case "imageWithProductHotspots":
            return isImageWithAsset(module.image) ? (
              <SanityImage
                key={module._key}
                src={module.image}
                sizes="(min-width: 600px) 600px, 100vw"
                placeholder="blur"
                className="w-full max-w-xl rounded-lg"
                data-sanity={encodeDataAttribute([
                  {
                    _key: module._key,
                    // `_index` is absent from `KeyedSegment` but required at runtime:
                    // resolving the source map throws on a keyed segment left at -1
                    // @ts-expect-error -- see above
                    _index: index,
                  },
                  "_type",
                ])}
              />
            ) : null;

          default:
            return null;
        }
      })}
    </section>
  );
}

export function SanityHomepage({
  homepage,
  encodeDataAttribute,
}: {
  homepage: Homepage;
  encodeDataAttribute: EncodeDataAttributeFunction;
}) {
  return (
    <>
      {homepage.hero ? (
        <HeroSection hero={homepage.hero} encodeDataAttribute={encodeDataAttribute.scope(["hero"])} />
      ) : null}
      {homepage.modules ? (
        <ModulesSection
          modules={homepage.modules}
          encodeDataAttribute={encodeDataAttribute.scope(["modules"])}
        />
      ) : null}
    </>
  );
}
