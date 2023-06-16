/* eslint-disable react/require-default-props */
import type {GroqStoreProviderProps} from '@sanity/preview-kit/groq-store'
import {lazy, type ReactNode, Suspense} from 'react'

import {PreviewContext} from './context'

const PreviewProvider = lazy(() => import('./PreviewProvider'))

type SanityPreviewProps = Omit<
  GroqStoreProviderProps,
  'projectId' | 'dataset' | 'token' | 'EventSource'
> & {
  projectId?: string | null
  dataset?: string | null
  token?: string | null
  children: ReactNode
  fallback?: ReactNode
}

/**
 * TODO: inline documentation
 * @see https://www.sanity.io/docs/preview-content-on-site
 */
export function SanityPreview(props: SanityPreviewProps) {
  const {
    children,
    projectId,
    dataset,
    token,
    listen = true,
    overlayDrafts = true,
    fallback = <div>Loading preview...</div>,
    ...rest
  } = props

  if (typeof document === 'undefined' || !(projectId && dataset && token)) {
    return <>{children}</>
  }

  return (
    <PreviewContext.Provider value={{projectId}}>
      <Suspense fallback={fallback}>
        <PreviewProvider
          {...rest}
          projectId={projectId}
          dataset={dataset}
          token={token}
          listen={listen}
          overlayDrafts={overlayDrafts}
        >
          {children}
        </PreviewProvider>
      </Suspense>
    </PreviewContext.Provider>
  )
}
