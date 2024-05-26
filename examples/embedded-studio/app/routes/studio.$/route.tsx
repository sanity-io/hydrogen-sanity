import {useLoaderData} from '@remix-run/react';
import {
  type MetaFunction,
  type LinksFunction,
  type LoaderFunction,
  type SerializeFrom,
  json,
} from '@shopify/remix-oxygen';
import {lazy, type ReactElement, Suspense} from 'react';
import studioStyles from './studio.css?url';
import {ClientOnly} from './ClientOnly';

/**
 * Provide a consistent fallback to prevent hydration mismatch errors.
 */
function SanityStudioFallback(): ReactElement {
  return <></>;
}

/**
 * If server-side rendering, then return the fallback instead of the heavy dependency.
 * @see https://remix.run/docs/en/1.14.3/guides/constraints#browser-only-code-on-the-server
 */
const SanityStudio =
  typeof document === 'undefined'
    ? SanityStudioFallback
    : lazy(
        () =>
          /**
           * `lazy` expects the component as the default export
           * @see https://react.dev/reference/react/lazy
           */
          import('./SanityStudio.client'),
      );

export const meta: MetaFunction = () => [
  {
    name: 'viewport',
    content: 'width=device-width,initial-scale=1,viewport-fit=cover',
  },
  {
    name: 'referrer',
    content: 'same-origin',
  },
  {
    name: 'robots',
    content: 'noindex',
  },
];

/**
 * (Optional) Prevent Studio from being cached
 */
export function headers(): HeadersInit {
  return {
    'Cache-Control': 'no-store',
  };
}

export const links: LinksFunction = () => {
  return [{rel: 'stylesheet', href: studioStyles}];
};

export const loader: LoaderFunction = ({context}) => {
  const {env} = context;
  const projectId = env.PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error('PUBLIC_SANITY_PROJECT_ID environment variable is not set');
  }

  const dataset = env.PUBLIC_SANITY_DATASET;
  if (!dataset) {
    throw new Error('PUBLIC_SANITY_DATASET environment variable is not set');
  }

  return json({
    projectId,
    dataset,
    basePath: '/studio',
  });
};

export default function Studio() {
  // @ts-expect-error
  const {projectId, dataset, basePath} =
    useLoaderData<SerializeFrom<typeof loader>>();

  return (
    <ClientOnly>
      {() => (
        <Suspense>
          <SanityStudio
            projectId={projectId}
            dataset={dataset}
            basePath={basePath}
          />
        </Suspense>
      )}
    </ClientOnly>
  );
}
