import {createServer, type IncomingMessage, type Server} from 'node:http'
import type {AddressInfo} from 'node:net'

import {createClient, type SanityClient} from '@sanity/client'

/** Describes one request that the fake Content Lake received. */
export interface RecordedRequest {
  path: string
  query: string
  params: URLSearchParams
  headers: IncomingMessage['headers']
}

/** Describes the answer of the fake Content Lake to one query. */
export interface LakeAnswer {
  result: unknown
  syncTags?: string[]
}

export interface FakeLake {
  url: string
  requests: RecordedRequest[]
  /** Creates a client that talks to the fake Content Lake. */
  client(options?: {useCdn?: boolean}): SanityClient
  close(): Promise<void>
}

/** The secret that the fake Content Lake accepts for preview entry. */
export const VALID_SECRET = 'valid-secret'

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Starts a local HTTP server that answers GROQ queries like the Content Lake. Tests then use a
 * real `@sanity/client` with no network access.
 */
export async function startFakeLake(answer: (query: string, params: URLSearchParams) => LakeAnswer): Promise<FakeLake> {
  const requests: RecordedRequest[] = []
  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    let query = url.searchParams.get('query') ?? ''
    const params = new URLSearchParams(url.searchParams)
    if (request.method === 'POST') {
      const body: unknown = JSON.parse((await readBody(request)) || '{}')
      if (typeof body === 'object' && body !== null && 'query' in body && typeof body.query === 'string') {
        query = body.query
      }
    }
    requests.push({path: url.pathname, query, params, headers: request.headers})

    let payload: LakeAnswer
    if (query.includes('sanity.previewUrlSecret')) {
      const secret = JSON.parse(params.get('$secret') ?? '""')
      payload = {
        result: {
          private:
            secret === VALID_SECRET
              ? {_id: 'secret-id', _updatedAt: new Date().toISOString(), secret, studioUrl: 'https://studio.example.com'}
              : null,
          public: null,
        },
      }
    } else {
      payload = answer(query, params)
    }
    response.writeHead(200, {'Content-Type': 'application/json'})
    response.end(JSON.stringify({ms: 1, ...payload}))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? (address satisfies AddressInfo).port : 0
  const url = `http://127.0.0.1:${port}`

  return {
    url,
    requests,
    client: (options = {}) =>
      createClient({
        projectId: 'p1',
        dataset: 'production',
        apiVersion: '2026-11-01',
        apiHost: url,
        useProjectHostname: false,
        useCdn: options.useCdn ?? true,
      }),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
