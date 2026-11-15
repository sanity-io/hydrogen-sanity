import {createClient} from '@sanity/client'
import {memoryCache} from 'react-router-sanity/cache'
import {createSanityMiddleware} from 'react-router-sanity/server'

// One cache per server process. The middleware creates the per-request state.
const cache = memoryCache({maxEntries: 1000})

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Set the ${name} environment variable. See examples/react-router/.env.example.`)
  return value
}

// E2E tests point the client at a local fake Content Lake with SANITY_API_HOST.
const apiHost = process.env.SANITY_API_HOST

export const sanityMiddleware = createSanityMiddleware(() => ({
  client: createClient({
    projectId: required('SANITY_PROJECT_ID'),
    dataset: required('SANITY_DATASET'),
    apiVersion: '2026-11-01',
    useCdn: true,
    ...(apiHost ? {apiHost, useProjectHostname: false} : {}),
  }),
  serverToken: process.env.SANITY_VIEWER_TOKEN,
  studioUrl: process.env.SANITY_STUDIO_URL,
  preview: {sessionSecrets: [required('SANITY_PREVIEW_SECRET')]},
  cache: {store: cache},
  live: {secret: process.env.SANITY_LIVE_SECRET},
}))
