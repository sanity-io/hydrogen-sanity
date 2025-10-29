import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID

export default defineCliConfig({
  api: {
    projectId,
    dataset: 'production',
  },

  reactStrictMode: true,

  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  deployment: {
    autoUpdates: false,
  },

  studioHost: process.env.SANITY_STUDIO_HOSTNAME,
})
