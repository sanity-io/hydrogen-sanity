import {RouterContextProvider, type MiddlewareFunction} from 'react-router'

/**
 * Runs a middleware with a route handler, like React Router does for one request.
 */
export async function runMiddleware(
  middleware: MiddlewareFunction<Response>,
  request: Request,
  route: (context: RouterContextProvider) => Promise<Response> | Response,
): Promise<Response> {
  const context = new RouterContextProvider()
  const result = await middleware(
    {request, url: new URL(request.url), pattern: '/', params: {}, context},
    async () => route(context),
  )
  if (!(result instanceof Response)) throw new Error('The middleware did not return a Response')
  return result
}

/** Returns every `Set-Cookie` value of a response. */
export function setCookies(response: Response): string[] {
  return response.headers.getSetCookie()
}

/** Turns `Set-Cookie` values into a `Cookie` request header. */
export function toCookieHeader(cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ')
}
