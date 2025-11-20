import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {env, sanity} = context;
  const {preview, SanityProvider} = sanity;
  const isPreviewEnabled = preview?.enabled;

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    defaultSrc: ['https://cdn.sanity.io'],
    shop: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
    },

    // When preview is enabled for the current session, allow the Studio to embed the storefront in the Presentation tool
    frameAncestors: [
      // Allow Dashboard to embed the Studio and Presentation tool
      'https://www.sanity.io',
      ...(isPreviewEnabled ? [env.SANITY_STUDIO_ORIGIN] : []),
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <SanityProvider>
        <ServerRouter
          context={reactRouterContext}
          url={request.url}
          nonce={nonce}
        />
      </SanityProvider>
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
