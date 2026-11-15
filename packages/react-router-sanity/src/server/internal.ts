import {createContext, type RouterContextProvider} from 'react-router'

import {SanityRouterError} from '../errors'
import type {SanityMiddlewareConfig} from './config'
import type {PreviewSession} from './session'

/**
 * Holds the per-request state that only SDK routes read. It never reaches loader data.
 *
 * @internal
 */
export interface SanityInternalState {
  config: SanityMiddlewareConfig
  request: Request
  session: PreviewSession | undefined
  /** Tells the middleware to commit the session after the route runs. */
  sessionDirty: boolean
  /** Tells the middleware that the preview state changed during the request. */
  previewChanged: boolean
}

function unregistered(): never {
  throw new SanityRouterError('RRS010')
}

/** @internal */
export const sanityInternalContext = createContext<SanityInternalState>({
  get config(): never {
    return unregistered()
  },
  get request(): never {
    return unregistered()
  },
  get session(): never {
    return unregistered()
  },
  get sessionDirty(): never {
    return unregistered()
  },
  set sessionDirty(_value: boolean) {
    unregistered()
  },
  get previewChanged(): never {
    return unregistered()
  },
  set previewChanged(_value: boolean) {
    unregistered()
  },
})

/**
 * Reads the internal state, or throws RRS010 when the middleware is not registered.
 *
 * @internal
 */
export function getInternal(context: Readonly<RouterContextProvider>): SanityInternalState {
  return context.get(sanityInternalContext)
}
