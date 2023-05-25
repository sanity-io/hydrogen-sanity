/* eslint-disable react/require-default-props */
import {definePreview, type Params, PreviewSuspense} from '@sanity/preview-kit'
import {createCookieSessionStorage, type Session, type SessionStorage} from '@shopify/remix-oxygen'
import {createContext, ElementType, type ReactNode, useContext, useMemo} from 'react'

type UsePreview = <R = any, P extends Params = Params, Q extends string = string>(
  query: Q,
  params?: P,
  serverSnapshot?: R
) => R

export type PreviewData = {
  projectId: string
  dataset: string
  token: string
}

export type PreviewProps = {
  children: ReactNode
  fallback?: ReactNode
  preview?: PreviewData
}

export class PreviewSession {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private sessionStorage: SessionStorage, private session: Session) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: '__preview',
        httpOnly: true,
        sameSite: true,
        secrets,
      },
    })

    const session = await storage.getSession(request.headers.get('Cookie'))

    return new this(storage, session)
  }

  has(key: string) {
    return this.session.has(key)
  }

  // get(key: string) {
  //   return this.session.get(key);
  // }

  destroy() {
    return this.sessionStorage.destroySession(this.session)
  }

  // unset(key: string) {
  //   this.session.unset(key);
  // }

  set(key: string, value: any) {
    this.session.set(key, value)
  }

  commit() {
    return this.sessionStorage.commitSession(this.session)
  }
}

const PreviewContext = createContext<
  | {
      /**
       * Query Sanity and subscribe to changes, optionally
       * passing a server snapshot to speed up hydration
       */
      usePreview: UsePreview
    }
  | undefined
>(undefined)

export const usePreviewContext = () => useContext(PreviewContext)

/**
 * Conditionally apply `PreviewSuspense` boundary
 * @see https://www.sanity.io/docs/preview-content-on-site
 */
export function Preview(props: PreviewProps) {
  const {children, preview} = props

  if (!preview?.token) {
    return <>{children}</>
  }

  const fallback = props.fallback ?? <div>Loading preview...</div>
  const {projectId, dataset, token} = preview
  const _usePreview = definePreview({
    projectId,
    dataset,
    overlayDrafts: true,
  })

  function usePreview<R = any, P extends Params = Params, Q extends string = string>(
    query: Q,
    params?: P,
    serverSnapshot?: R
  ): R {
    return _usePreview(token, query, params, serverSnapshot)
  }
  usePreview satisfies UsePreview

  return (
    <PreviewContext.Provider value={{usePreview}}>
      <PreviewSuspense fallback={fallback}>{children}</PreviewSuspense>
    </PreviewContext.Provider>
  )
}

/**
 * Select and memoize which component to render based on preview mode
 * @deprecated use `SanityPreview` instead
 */
export function usePreviewComponent<T>(component: ElementType<T>, preview: ElementType<T>) {
  const isPreview = Boolean(usePreviewContext())

  return useMemo(() => (isPreview ? preview : component), [component, isPreview, preview])
}

type PreviewDataProps<T> = {
  data: T
  children: ReactNode | ((data: T | null) => ReactNode)
  query?: string | null
  params?: Params
}

/**
 * Component to use for rendering in preview mode
 *
 * When provided a Sanity query and render prop,
 * changes will be streamed in the client
 */
export function SanityPreview<T = unknown>(props: PreviewDataProps<T>) {
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
  params?: Params
  children: (data: T | null) => ReactNode
}

/**
 * Subscribe to live preview and delegate rendering to consumer
 */
function ResolvePreview<T = unknown>(props: ResolvePreviewProps<T>) {
  const {serverSnapshot, query, params, children} = props
  // This won't break the conditional rule of hooks,
  // **but** it relies on the assumption that this component
  // will only be used in preview mode   👇🏻
  const {usePreview} = usePreviewContext()!
  const data = usePreview(query, params, serverSnapshot)

  return <>{children(data)}</>
}
