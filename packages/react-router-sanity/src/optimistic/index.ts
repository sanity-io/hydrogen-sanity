'use client'
/**
 * Preview levels L3 and L4: query results and optimistic updates from Presentation.
 *
 * Important: a static import of this entry adds its code to the route chunk in production. Import
 * it only in components that render in preview, and load those components with `lazy()`.
 *
 * @packageDocumentation
 */
export {
  useDocuments,
  useIsPresentationTool,
  useOptimistic,
  usePresentationQuery,
  type UsePresentationQueryReturns,
} from '@sanity/visual-editing/react'
