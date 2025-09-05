import type {AppLoadContext} from '@shopify/remix-oxygen';
import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: AppLoadContext,
) {
  const {env, sanity} = context;
  const {preview, SanityProvider, client} = sanity;
  const {projectId, dataset} = client.config();
  const isPreviewEnabled = preview?.enabled;

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    defaultSrc: [
      // TODO: add CSP helpers
      `https://cdn.sanity.io/images/${projectId}/${dataset}`,
    ],
    shop: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
    },

    // When preview is enabled for the current session, allow the Studio to embed the storefront in the Presentation tool
    ...(isPreviewEnabled
      ? {
          frameAncestors: env.SANITY_STUDIO_ORIGIN,
        }
      : {}),
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
