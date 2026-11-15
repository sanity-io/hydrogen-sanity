import type {SyncTag} from '@sanity/client'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSyncTag(value: unknown): value is SyncTag {
  return typeof value === 'string' && value.startsWith('s1:')
}

/**
 * Collects the sync tags of the current page from route loader data.
 *
 * Each route returns the sync tags of its queries as a top-level `syncTags` field. The function
 * reads that field from every match.
 *
 * @param loaderData - The loader data of every matched route.
 * @returns The unique sync tags.
 * @internal
 */
export function collectSyncTags(loaderData: readonly unknown[]): Set<SyncTag> {
  const tags = new Set<SyncTag>()
  for (const data of loaderData) {
    if (!isRecord(data) || !Array.isArray(data.syncTags)) continue
    for (const tag of data.syncTags) if (isSyncTag(tag)) tags.add(tag)
  }
  return tags
}

/**
 * Tells if a live event touches the page.
 *
 * When no route returned sync tags, the page cannot match events by tag. Every event then
 * touches the page, so the page stays correct at the cost of extra revalidations.
 *
 * @param eventTags - The tags of the live event.
 * @param pageTags - The sync tags of the page.
 * @returns `true` when the page must revalidate.
 * @internal
 */
export function eventTouchesPage(eventTags: readonly SyncTag[], pageTags: ReadonlySet<SyncTag>): boolean {
  if (pageTags.size === 0) return true
  return eventTags.some((tag) => pageTags.has(tag))
}
