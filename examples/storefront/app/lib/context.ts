import {createHydrogenContext} from '@shopify/hydrogen';
import {createSanityContext, type SanityContext} from 'hydrogen-sanity';
import {PreviewSession} from 'hydrogen-sanity/preview/session';
import {isPreviewEnabled} from 'hydrogen-sanity/preview';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import {filter} from './sanity/stega';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {
    sanity: SanityContext;
  }
}

/**
 * Creates Hydrogen context for React Router 7.9.x
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session, previewSession] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
    PreviewSession.init(request, [env.SESSION_SECRET]),
  ]);

  const sanity = await createSanityContext({
    request,
    cache,
    waitUntil,

    client: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      useCdn: false,
      stega: {
        enabled: isPreviewEnabled(env.SANITY_PROJECT_ID, previewSession),
        filter,
        studioUrl: env.SANITY_STUDIO_ORIGIN,
      },
    },

    preview: {
      token: env.SANITY_PREVIEW_TOKEN,
      session: previewSession,
    },
  });

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      // Or detect from URL path based on locale subpath, cookies, or any other strategy
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    {
      ...additionalContext,
      sanity,
    } as const,
  );

  return hydrogenContext;
}
