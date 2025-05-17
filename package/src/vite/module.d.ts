declare module 'virtual:sanity/csp' {
  import type {createContentSecurityPolicy} from '@shopify/hydrogen'
  export const contentSecurityPolicy: Parameters<typeof createContentSecurityPolicy>[0]
}

declare module 'virtual:sanity/studio' {
  import type {ComponentType} from 'react'
  export const Studio: ComponentType
}

declare module 'virtual:sanity/config' {
  import type {Config} from 'sanity'
  const config: Config
  export default config
}
