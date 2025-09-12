import {useSyncExternalStore} from 'react'

// Subscribers for the external store pattern
const listeners = new Set<() => void>()
// Track active Query components and useQuery hooks using stable IDs
const activeQueries = new Set<string>()

/**
 * Adds a query ID to the active queries set and notifies subscribers.
 * Returns a cleanup function to remove the query when it unmounts.
 */
export function registerQuery(id: string): () => void {
  activeQueries.add(id)

  // Notify all subscribers that the query state has changed
  for (const listener of listeners) {
    listener()
  }

  // Return cleanup function
  return function unregisterQuery() {
    activeQueries.delete(id)

    // Notify all subscribers that the query state has changed
    for (const listener of listeners) {
      listener()
    }
  }
}

/**
 * Subscribe function for the external store pattern.
 */
function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)

  return function unsubscribe() {
    listeners.delete(onStoreChange)
  }
}

/**
 * Get the current snapshot of whether any queries are active.
 */
function getSnapshot(): boolean {
  return activeQueries.size > 0
}

/**
 * Get the server snapshot (always false since queries only matter client-side).
 */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Hook that checks if any loaders are active
 */
export function useHasActiveLoaders(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
