import type {FilterDefault, ResolveStudioUrl} from '@sanity/client';

// `filter` is a function, so it can't cross the server→client boundary (loader
// data must be serializable). Define it once and import into both
// `lib/context.ts` (server) and `root.tsx` (client).
export const filter: FilterDefault = (props) => {
  return props.filterDefault(props);
};

// A function-valued `studioUrl` needs the same treatment — define it here and
// import it into both places, like `filter`:
// export const studioUrl: ResolveStudioUrl = (props) => {
// }
