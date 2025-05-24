import {type Plugin} from 'vite'

export function sanity(): Plugin {
  return {
    name: 'sanity',

    config() {
      return {
        ssr: {
          optimizeDeps: {
            include: ['hydrogen-sanity'],
          },
        },
      }
    },
  }
}
