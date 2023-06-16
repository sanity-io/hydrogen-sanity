/* eslint-disable react/require-default-props */
import type {QueryParams} from '@sanity/client'
import {useListeningQuery} from '@sanity/preview-kit'
import {type ReactNode} from 'react'

import {usePreviewContext} from './context'

type PreviewProps<T> = {
  data: T
  children: ReactNode | ((data?: T | null) => ReactNode)
  query?: string | null
  params?: QueryParams
}

/**
 * Component to use for rendering in preview mode
 *
 * When provided a Sanity query and render prop,
 * changes will be streamed in the client
 */
export function GroqPreview<T = unknown>(props: PreviewProps<T>) {
  const {data, children, query, params} = props
  const isPreview = Boolean(usePreviewContext())

  if (typeof children !== 'function') {
    return children
  }

  if (isPreview && query) {
    return (
      <ResolvePreview<typeof data> query={query} params={params} serverSnapshot={data}>
        {children}
      </ResolvePreview>
    )
  }

  return <>{children(data)}</>
}

type ResolvePreviewProps<T> = {
  serverSnapshot?: T | null
  query: string
  params?: QueryParams
  children: (data?: T | null) => ReactNode
}

/**
 * Subscribe to live preview and delegate rendering to consumer
 */
function ResolvePreview<T = unknown>(props: ResolvePreviewProps<T>) {
  const {serverSnapshot, query, params, children} = props
  const data = useListeningQuery(serverSnapshot, query, params)

  return <>{children(data)}</>
}
