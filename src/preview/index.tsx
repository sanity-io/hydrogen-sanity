/* eslint-disable react/require-default-props */
import type {QueryParams} from '@sanity/client'
import {useListeningQuery} from '@sanity/preview-kit'
import type {GroqStoreProviderProps} from '@sanity/preview-kit/groq-store'
import {createCookieSessionStorage, type Session, type SessionStorage} from '@shopify/remix-oxygen'
import {createContext, lazy, type ReactNode, Suspense, useContext} from 'react'

export class PreviewSession {
  #sessionStorage: SessionStorage
  #session: Session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

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
    return this.#session.has(key)
  }

  // get(key: string) {
  //   return this.session.get(key);
  // }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session)
  }

  // unset(key: string) {
  //   this.session.unset(key);
  // }

  set(key: string, value: any) {
    this.#session.set(key, value)
  }

  commit() {
    return this.#sessionStorage.commitSession(this.#session)
  }
}

const PreviewContext = createContext<{projectId: string} | undefined>(undefined)

export const usePreviewContext = () => useContext(PreviewContext)

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

  if (!(projectId && dataset && token)) {
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
export function Preview<T = unknown>(props: PreviewProps<T>) {
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
