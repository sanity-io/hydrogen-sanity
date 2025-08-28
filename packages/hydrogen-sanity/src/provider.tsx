import type {InitializedClientConfig} from '@sanity/client'
import type {HTMLProps, PropsWithChildren, ReactNode} from 'react'

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

export function useSanityProviderValue(): SanityProviderValue {
  // @ts-expect-error: globalThis may not have the 'Sanity Provider' symbol in its type
  const providerValue = globalThis[Symbol.for('Sanity Provider')] as SanityProviderValue | null

  assertSanityProviderValue(providerValue)

  return providerValue!
}

export function SanityProvider({
  value,
  children,
}: PropsWithChildren<{value: SanityProviderValue}>): ReactNode {
  // Set global symbol for both server and client
  // @ts-expect-error: globalThis may not have the 'Sanity Provider' symbol in its type
  globalThis[Symbol.for('Sanity Provider')] = Object.freeze(value)
  return <>{children}</>
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
