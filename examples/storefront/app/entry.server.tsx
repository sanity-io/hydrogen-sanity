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
  const {SanityProvider, csp} = context.sanity;

  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    // Include Sanity domains in the CSP
    defaultSrc: [
      csp.asset,
      csp.apiCdn,
    ],
    connectSrc: [
      csp.api,
    ],
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // Allow embedded Studio to load storefront
    frameAncestors: [`'self'`],
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
