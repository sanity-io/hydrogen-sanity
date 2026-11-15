import {index, route, type RouteConfig} from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('pages/:slug', 'routes/page.tsx'),
  route('streaming', 'routes/streaming.tsx'),
  route('api/preview', 'routes/api.preview.ts'),
  route('api/sanity/invalidate', 'routes/api.sanity.invalidate.ts'),
] satisfies RouteConfig
