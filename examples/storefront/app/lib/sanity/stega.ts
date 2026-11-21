import type { FilterDefault } from "@sanity/client";

/**
 * Decides which strings get stega-encoded for click-to-edit. Sanity Connect syncs the `store`
 * fields of products and collections from Shopify and makes them read-only in the Studio, so
 * they get no overlays.
 *
 * `filter` is a function, so it can't cross the server→client boundary in loader data. Import it
 * into both `lib/sanity/context.ts` (server) and `root.tsx` (client).
 */
export const filter: FilterDefault = (props) => {
  if (props.sourcePath[0] === "store") return false;
  return props.filterDefault(props);
};
