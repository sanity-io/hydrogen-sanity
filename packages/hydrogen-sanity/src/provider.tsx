import type {InitializedClientConfig} from '@sanity/client'
import type {HTMLProps, PropsWithChildren, ReactNode} from 'react'

/**
 * Contains essential Sanity client configuration and preview/stega state.
 */
export interface SanityProviderValue
  extends Required<
    Pick<
      InitializedClientConfig,
      'projectId' | 'dataset' | 'apiHost' | 'apiVersion' | 'perspective'
    >
  > {
  previewEnabled: boolean
  stegaEnabled: boolean
}

/**
 * Type guard that asserts a value is a valid SanityProviderValue.
 * Throws an error if the provider value is missing or invalid.
 */
export function assertSanityProviderValue(value: unknown): value is SanityProviderValue {
  if (typeof value === 'undefined') {
    throw new Error(
      'Failed to find a Sanity provider value. Did you forget to wrap your app in a `SanityProvider`?',
    )
  }

  return true
}

/**
 * Hook that retrieves the current Sanity provider configuration.
 * Must be used within a SanityProvider component tree.
 */
export function useSanityProviderValue(): SanityProviderValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providerValue = (globalThis as any)[Symbol.for('Sanity Provider')]
  assertSanityProviderValue(providerValue)
  return providerValue
}

/**
 * Provider that makes Sanity configuration available to child components.
 * Serializes configuration across server-client boundary via globalThis.
 */
export function SanityProvider({
  value,
  children,
}: PropsWithChildren<{value: SanityProviderValue}>): ReactNode {
  setProviderValue(value)
  return <>{children}</>
}

/**
 * Script component that hydrates Sanity configuration on the client side.
 * Injects provider configuration into the client bundle for SSR compatibility.
 */
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

/**
 * Props for the Sanity script component.
 * Extends HTMLScriptElement props while excluding conflicting attributes.
 */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any)[Symbol.for('Sanity Provider')] = Object.freeze(value)
}
