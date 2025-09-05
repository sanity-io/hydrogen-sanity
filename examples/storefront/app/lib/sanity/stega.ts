import type {FilterDefault, ResolveStudioUrl} from '@sanity/client';

export const filter: FilterDefault = (props) => {
  return props.filterDefault(props);
};

// export const studioUrl: ResolveStudioUrl = (props) => {
// }
