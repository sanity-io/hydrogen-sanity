/* eslint-disable react/require-default-props */
import {type ClientConfig, createClient} from '@sanity/client'
import type {LiveQueryProviderProps} from '@sanity/preview-kit'
import {lazy, type ReactNode, Suspense, useEffect, useState, useTransition} from 'react'

import {PreviewContext} from './context'

const LiveQueryProvider = lazy(() =>
  import('@sanity/preview-kit').then((m) => ({default: m.LiveQueryProvider}))
)

type SanityPreviewProps = Omit<LiveQueryProviderProps, 'client'> & {
  fallback?: ReactNode
  previewConfig?: ClientConfig
}

/**
 * TODO: inline documentation
 * @see https://www.sanity.io/docs/preview-content-on-site
 */
export function PreviewProvider(props: SanityPreviewProps) {
  const {children, previewConfig, fallback = children, ...rest} = props

  const [, startTransition] = useTransition()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => startTransition(() => setHydrated(true)), [])

  if (!hydrated || !previewConfig || !previewConfig.projectId) {
    return children
  }

  const client = createClient(previewConfig)

  return (
    <PreviewContext.Provider value={{projectId: previewConfig.projectId}}>
      <Suspense fallback={fallback}>
        <LiveQueryProvider {...rest} client={client}>
          {children}
        </LiveQueryProvider>
      </Suspense>
    </PreviewContext.Provider>
  )
}
