import {GroqStoreProvider, type GroqStoreProviderProps} from '@sanity/preview-kit/groq-store'
import type {ReactNode} from 'react'

type PreviewProviderProps = GroqStoreProviderProps & {children: ReactNode}

export function PreviewProvider(props: PreviewProviderProps) {
  const {children, ...rest} = props

  return <GroqStoreProvider {...rest}>{children}</GroqStoreProvider>
}

/** interoperability with `React.lazy` */
export default PreviewProvider
