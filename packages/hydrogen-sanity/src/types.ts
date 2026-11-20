import type {Session} from 'react-router'

export type WaitUntil = (promise: Promise<unknown>) => void

/**
 * The session shape that Hydrogen 2026.4 and earlier exports as `HydrogenSession`.
 * Hydrogen 2026.10 removes the type, so the package declares it.
 */
export interface HydrogenSession {
  get: Session['get']
  set: Session['set']
  unset: Session['unset']
  commit: () => Promise<string>
  destroy?: () => Promise<string>
  isPending?: boolean
}
