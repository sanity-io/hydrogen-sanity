import type {InitializedClientConfig} from '@sanity/client'
import {createContext, type HTMLProps, type PropsWithChildren, type ReactNode, use} from 'react'

import {isServer} from './utils'

/**
 * The project configuration, which is the same for every request.
 */
export type SanityProjectConfig = Required<
  Pick<InitializedClientConfig, 'projectId' | 'dataset' | 'apiHost' | 'apiVersion'>
>

/**
 * Contains essential Sanity client configuration and preview/stega state.
 */
export interface SanityProviderValue
  extends SanityProjectConfig, Required<Pick<InitializedClientConfig, 'perspective'>> {
  previewEnabled: boolean
  stegaEnabled: boolean
}

const GLOBAL_KEY = Symbol.for('Sanity Provider')

/**
 * Carries the provider value during server rendering. A server handles concurrent requests in
 * one runtime, so request state (preview mode, perspective) can't live in a global there.
 */
const SanityProviderContext = createContext<SanityProviderValue | undefined>(undefined)

/**
 * Throws if the Sanity provider value is missing.
 */
export function assertSanityProviderValue(
  value: SanityProviderValue | undefined,
): asserts value is SanityProviderValue {
  if (typeof value === 'undefined') {
    throw new Error(
      'Failed to find a Sanity provider value. Wrap the app in `context.sanity.SanityProvider` in `entry.server.tsx`, and render `<Sanity />` in the root layout.',
    )
  }
}

/**
 * Hook that retrieves the current Sanity provider configuration.
 * Must be used within a SanityProvider component tree.
 */
export function useSanityProviderValue(): SanityProviderValue {
  const providerValue = use(SanityProviderContext) ?? readGlobal()
  assertSanityProviderValue(providerValue)
  return providerValue
}

/**
 * Hook that returns the project configuration, if a provider is set.
 * @internal
 */
export function useSanityProjectConfig(): SanityProjectConfig | undefined {
  return use(SanityProviderContext) ?? readGlobalProjectConfig()
}

/**
 * Reads the project configuration outside of a hook. On the server this holds only the project
 * configuration, never request state.
 * @internal
 */
export function getSanityProviderValue(): SanityProjectConfig | undefined {
  return readGlobalProjectConfig()
}

/**
 * Provider that makes Sanity configuration available to child components.
 */
export function SanityProvider({
  value,
  children,
}: PropsWithChildren<{value: SanityProviderValue}>): ReactNode {
  if (isServer()) {
    const {projectId, dataset, apiHost, apiVersion} = value
    writeGlobal({projectId, dataset, apiHost, apiVersion})
  } else {
    writeGlobal(value)
  }
  return <SanityProviderContext value={value}>{children}</SanityProviderContext>
}

/**
 * Script component that hydrates Sanity configuration on the client side.
 * Injects provider configuration into the client bundle for SSR compatibility.
 */
export function Sanity(props: SanityProps): ReactNode {
  const providerValue = useSanityProviderValue()

  return (
    <script
      {...props}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `(${setProviderValue})(${serializeForScript(providerValue)})`,
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

/**
 * Serializes a value as JSON that is safe to inline in a `<script>`. Escaping `<` stops a value
 * from closing the script element.
 */
export function serializeForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/**
 * Inlined into the `<Sanity>` script, so it can't reference module scope.
 */
function setProviderValue(value: SanityProviderValue) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any)[Symbol.for('Sanity Provider')] = Object.freeze(value)
}

function writeGlobal(value: SanityProviderValue | SanityProjectConfig) {
  Reflect.set(globalThis, GLOBAL_KEY, Object.freeze(value))
}

function readGlobal(): SanityProviderValue | undefined {
  const value: unknown = Reflect.get(globalThis, GLOBAL_KEY)
  return isProviderValue(value) ? value : undefined
}

function readGlobalProjectConfig(): SanityProjectConfig | undefined {
  const value: unknown = Reflect.get(globalThis, GLOBAL_KEY)
  return isProjectConfig(value) ? value : undefined
}

function isProjectConfig(value: unknown): value is SanityProjectConfig {
  return typeof value === 'object' && value !== null && 'projectId' in value && 'dataset' in value
}

function isProviderValue(value: unknown): value is SanityProviderValue {
  return isProjectConfig(value) && 'previewEnabled' in value
}
