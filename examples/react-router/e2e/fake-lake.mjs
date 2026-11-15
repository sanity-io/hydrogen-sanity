// A local stand-in for the Content Lake, so E2E runs with no network and no credentials.
// It answers the queries of the example app and the preview secret lookup of
// `@sanity/preview-url-secret`.
import {createServer} from 'node:http'

const PORT = Number(process.env.FAKE_LAKE_PORT ?? 4999)
export const VALID_SECRET = 'valid-secret'
const IMAGE_ID = 'image-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2-2000x1000-jpg'

function isDrafts(params) {
  const raw = params.get('perspective') ?? 'published'
  return raw.split(',').includes('drafts')
}

function answer(query, params) {
  if (query.includes('sanity.previewUrlSecret')) {
    const secret = JSON.parse(params.get('$secret') ?? '""')
    return {
      result: {
        private:
          secret === VALID_SECRET
            ? {_id: 'secret', _updatedAt: new Date().toISOString(), secret, studioUrl: 'https://studio.example.com'}
            : null,
        public: null,
      },
    }
  }
  if (query.includes('_type == "home"')) {
    return {
      result: {
        title: isDrafts(params) ? 'Draft home' : 'Published home',
        image: {
          alt: 'A chair',
          // The fake lake is also the image CDN, as `api.<domain>` → `cdn.<domain>` would be for a
          // custom host. Server, browser and CSP then agree on one host, as in a real deployment.
          asset: {
            _id: IMAGE_ID,
            url: `http://127.0.0.1:${PORT}/images/p1/production/${IMAGE_ID.slice(6).replace(/-jpg$/, '.jpg')}`,
          },
        },
      },
      syncTags: ['s1:home'],
    }
  }
  if (query.includes('_type == "page"')) {
    const slug = JSON.parse(params.get('$slug') ?? '""')
    return {result: slug === 'about' ? {title: 'About'} : null, syncTags: ['s1:page']}
  }
  return {result: null, syncTags: []}
}

let count = 0
createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/health') return void response.end('ok')
  if (url.pathname === '/count') return void response.end(String(count))
  count++
  let query = url.searchParams.get('query') ?? ''
  if (request.method === 'POST') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    query = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}').query ?? query
  }
  response.writeHead(200, {'Content-Type': 'application/json'})
  response.end(JSON.stringify({ms: 1, ...answer(query, url.searchParams)}))
}).listen(PORT, '127.0.0.1', () => console.log(`fake Content Lake on http://127.0.0.1:${PORT}`))
