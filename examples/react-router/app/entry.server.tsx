import {PassThrough} from 'node:stream'

import {createReadableStreamFromReadable} from '@react-router/node'
import {isbot} from 'isbot'
import {renderToPipeableStream} from 'react-dom/server'
import {ServerRouter, type EntryContext, type RouterContextProvider} from 'react-router'
import {createNonce, getSanityCspDirectives, serializeCsp} from 'react-router-sanity/csp'

import {NonceContext} from './lib/nonce'

export const streamTimeout = 5_000

/**
 * A strict, nonce-based Content Security Policy. The app allows no inline script or style of its
 * own. `getSanityCspDirectives` adds what Sanity needs, and in preview lets Presentation frame
 * the page.
 */
function contentSecurityPolicy(nonce: string, context: RouterContextProvider): string {
  return serializeCsp(
    {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", `'nonce-${nonce}'`],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
    getSanityCspDirectives(context),
  )
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  const nonce = createNonce()
  const policy = contentSecurityPolicy(nonce, loadContext)

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get('user-agent')
    const waitForAll = (userAgent && isbot(userAgent)) || routerContext.isSpaMode

    const onReady = () => {
      shellRendered = true
      const body = new PassThrough()
      responseHeaders.set('Content-Type', 'text/html')
      responseHeaders.set('Content-Security-Policy', policy)
      resolve(new Response(createReadableStreamFromReadable(body), {headers: responseHeaders, status: responseStatusCode}))
      pipe(body)
    }

    const {pipe, abort} = renderToPipeableStream(
      <NonceContext value={nonce}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </NonceContext>,
      {
        nonce,
        ...(waitForAll ? {onAllReady: onReady} : {onShellReady: onReady}),
        onShellError: reject,
        onError(error: unknown) {
          responseStatusCode = 500
          if (shellRendered) console.error(error)
        },
      },
    )

    setTimeout(abort, streamTimeout + 1000)
  })
}
