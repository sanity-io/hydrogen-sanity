/* eslint-disable react/require-default-props */
import type {GroqStoreProviderProps} from '@sanity/preview-kit/groq-store'
import {lazy, type ReactNode, Suspense} from 'react'

import {PreviewContext} from './context'

const GroqStoreProvider = lazy(() =>
  import('@sanity/preview-kit/groq-store').then((m) => ({default: m.GroqStoreProvider}))
)

type SanityPreviewProps = Omit<GroqStoreProviderProps, 'projectId' | 'dataset' | 'token'> &
  Partial<Pick<GroqStoreProviderProps, 'projectId' | 'dataset' | 'token'>> & {
    fallback?: ReactNode
  }

/**
 * TODO: inline documentation
 * @see https://www.sanity.io/docs/preview-content-on-site
 */
export function PreviewProvider(props: SanityPreviewProps) {
  const {
    children,
    projectId,
    dataset,
    token,
    listen = true,
    overlayDrafts = true,
    fallback = children,
    ...rest
  } = props

  if (typeof document === 'undefined' || !(projectId && dataset && token)) {
    return <>{children}</>
  }

  return (
    <PreviewContext.Provider value={{projectId}}>
      <Suspense fallback={fallback}>
        <GroqStoreProvider
          {...rest}
          projectId={projectId}
          dataset={dataset}
          token={token}
          listen={listen}
          overlayDrafts={overlayDrafts}
        >
          {children}
        </GroqStoreProvider>
      </Suspense>
    </PreviewContext.Provider>
  )
}
