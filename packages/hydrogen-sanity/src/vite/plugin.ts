import type {Plugin} from 'vite'

export function sanity(): Plugin {
  return {
    name: 'sanity',

    async config() {
      return {
        envPrefix: ['SANITY_STUDIO_'],
        ssr: {
          optimizeDeps: {
            include: ['hydrogen-sanity', '@sanity/client'],
          },
        },
      }
    },
  }
}
