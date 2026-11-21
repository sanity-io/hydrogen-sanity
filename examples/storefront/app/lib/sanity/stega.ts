import type { FilterDefault } from "@sanity/client";

// `filter` is a function, so it can't cross the server→client boundary (loader
// data must be serializable). Define it once and import it into both
// `lib/sanity/context.ts` (server) and `root.tsx` (client).
export const filter: FilterDefault = (props) => {
  return props.filterDefault(props);
};
