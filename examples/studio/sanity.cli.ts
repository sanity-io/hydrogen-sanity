import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'ue589xuu',
    dataset: 'production',
  },

  reactCompiler: {
    target: '18',
  },

  reactStrictMode: true,

  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  autoUpdates: true,
})
