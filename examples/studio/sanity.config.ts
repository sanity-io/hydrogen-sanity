import {defineStudioConfig} from '@repo/sanity-config'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!

export default defineStudioConfig({
  projectId,
})
