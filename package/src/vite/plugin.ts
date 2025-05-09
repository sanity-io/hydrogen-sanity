import type {Plugin} from 'vite'

// import * as VirtualModule from './vmod'

// const studioRoute = VirtualModule.id('studio')
// const vmods = [studioRoute]

export function sanity(): Plugin {
  return {
    name: 'sanity',

    // resolveId(id) {
    //   if (vmods.includes(id)) {
    //     return VirtualModule.resolve(id)
    //   }

    //   return null
    // },

    // async load(id: string) {
    //   if (id === VirtualModule.resolve(studioRoute)) {
    //     const studioRoot = new URL('./studio/studio.tsx', import.meta.url).pathname
    //     return `export * from "${studioRoot}"`
    //   }

    //   return null
    // },
  }
}
