import type {InitializedClientConfig} from '@sanity/client'
import {createContext, type HTMLProps, type ReactNode, useContext, useMemo} from 'react'

import type {SanityContext} from './context'
import {isServer} from './utils'

export interface SanityProviderValue
  extends Required<Pick<InitializedClientConfig, 'projectId' | 'dataset' | 'apiHost'>> {
  preview: boolean
}

export function assertSanityProviderValue(value: unknown): value is SanityProviderValue {
  if (!value) {
    throw new Error(
      'Failed to find a Sanity provider value. Did you forget to wrap your app in a `SanityProvider`?',
    )
  }

  return true
}

const SanityContext = createContext<SanityProviderValue | null>(null)
export const SanityProvider = SanityContext.Provider

export const useSanityProviderValue = (): SanityProviderValue => {
  const serverContext = useContext(SanityContext)
  return useMemo<SanityProviderValue>(() => {
    const providerValue = isServer()
      ? serverContext
      : // @ts-expect-error: globalThis may not have the 'Sanity Provider' symbol in its type
        globalThis[Symbol.for('Sanity Provider')]

    assertSanityProviderValue(providerValue)

    return providerValue
  }, [serverContext])
}

export function Sanity(props: SanityProps): ReactNode {
  const providerValue = useSanityProviderValue()

  assertSanityProviderValue(providerValue)

  return (
    <script
      {...props}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `(${setProviderValue})(${JSON.stringify(providerValue)})`,
      }}
      suppressHydrationWarning
    />
  )
}

export type SanityProps = Omit<
  HTMLProps<HTMLScriptElement>,
  | 'children'
  | 'async'
  | 'defer'
  | 'src'
  | 'type'
  | 'noModule'
  | 'dangerouslySetInnerHTML'
  | 'suppressHydrationWarning'
>

function setProviderValue(value: SanityProviderValue) {
  Object.defineProperty(globalThis, Symbol.for('Sanity Provider'), {
    value: Object.freeze(value),
  })
}
