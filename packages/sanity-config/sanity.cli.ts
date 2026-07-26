import {defineCliConfig} from 'sanity/cli'

/**
 * This package is not a deployable Studio — it exists so `sanity schema extract` can run against
 * the shared schema and emit `schema.json` for TypeGen. `@sanity/cli` v6 requires a CLI config to
 * resolve a Studio context, so this file only carries what extraction needs.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: 'production',
  },
})
