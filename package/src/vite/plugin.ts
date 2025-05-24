import {type Plugin} from 'vite'

export function sanity(): Plugin {
  return {
    name: 'sanity',

    config() {
      return {
        envPrefix: ['SANITY_STUDIO_'],
        ssr: {
          optimizeDeps: {
            include: ['hydrogen-sanity'],
          },
        },
      }
    },
  }
}
