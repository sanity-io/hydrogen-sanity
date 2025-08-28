import {default as createImageUrlBuilder} from '@sanity/image-url'
import type {ImageUrlBuilder} from '@sanity/image-url/lib/types/builder'
import type {SanityImageSource, SanityModernClientLike} from '@sanity/image-url/lib/types/types'
import {useMemo} from 'react'

import {useSanityProviderValue} from './provider'

export function useImageUrlBuilder(): ImageUrlBuilder {
  const {projectId, dataset, apiHost} = useSanityProviderValue()
  return useMemo(() => {
    return createImageUrlBuilder({
      config: () => ({projectId, dataset, apiHost}),
    } as SanityModernClientLike)
  }, [apiHost, dataset, projectId])
}

export function useImageUrl(source: SanityImageSource): ImageUrlBuilder {
  const builder = useImageUrlBuilder()
  return builder.image(source)
}
