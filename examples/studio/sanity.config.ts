import {defineStudioConfig} from '@repo/sanity-config'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!

export default defineStudioConfig({
  projectId,
  presentation: {
    previewUrl: {
      initial: process.env.SANITY_STUDIO_PREVIEW_URL!,
      previewMode: {
        enable: 'api/preview',
        disable: 'api/preview',
      },
    },
    allowOrigins: [process.env.SANITY_STUDIO_PREVIEW_URL!],
  },
})
