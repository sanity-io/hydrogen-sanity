import type {Session} from 'react-router'

export type WaitUntil = (promise: Promise<unknown>) => void

/**
 * The session shape that Hydrogen 2026.4 and earlier exported as `HydrogenSession`.
 */
export interface HydrogenSession {
  get: Session['get']
  set: Session['set']
  unset: Session['unset']
  commit: () => Promise<string>
  destroy?: () => Promise<string>
  isPending?: boolean
}
