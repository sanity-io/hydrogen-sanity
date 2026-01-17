import {
  buildFileUrl as buildFileUrlBase,
  getFile,
  getFileAsset,
  tryGetFile,
  tryGetFileAsset,
  type FileUrlBuilderOptions,
  type PathBuilderOptions,
  type ResolvedSanityFile,
  type SanityFileAsset,
  type SanityFileSource,
  type SanityProjectDetails,
} from '@sanity/asset-utils'
import {useMemo} from 'react'

import {useSanityProviderValue} from './provider'

/**
 * Hook that returns a file URL for a Sanity file asset.
 * Automatically uses project configuration from the SanityProvider context.
 *
 * @param source - File source (file object, asset, reference, id, url, or path)
 * @returns The file URL, or null if the source cannot be resolved
 *
 * @example
 * ```tsx
 * function DownloadButton({ document }) {
 *   const fileUrl = useFileUrl(document.pdf)
 *   if (!fileUrl) return null
 *   return <a href={fileUrl} download>Download PDF</a>
 * }
 * ```
 */
export function useFileUrl(source: SanityFileSource | null | undefined): string | null {
  const {projectId, dataset} = useSanityProviderValue()

  return useMemo(() => {
    if (!source) return null
    const asset = tryGetFileAsset(source, {projectId, dataset})
    return asset?.url ?? null
  }, [source, projectId, dataset])
}

/**
 * Hook that returns a function to build file URLs from Sanity file assets.
 * Automatically uses project configuration from the SanityProvider context.
 *
 * @returns A function that takes a file source and returns a URL
 *
 * @example
 * ```tsx
 * function FileList({ files }) {
 *   const buildUrl = useFileUrlBuilder()
 *   return (
 *     <ul>
 *       {files.map((file) => (
 *         <li key={file._key}>
 *           <a href={buildUrl(file)}>Download</a>
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useFileUrlBuilder(): (source: SanityFileSource | null | undefined) => string | null {
  const {projectId, dataset} = useSanityProviderValue()

  return useMemo(() => {
    return (source: SanityFileSource | null | undefined) => {
      if (!source) return null
      const asset = tryGetFileAsset(source, {projectId, dataset})
      return asset?.url ?? null
    }
  }, [projectId, dataset])
}

/**
 * Builds a file URL from explicit parameters.
 * Use this when you don't have access to React context or need to build URLs on the server.
 *
 * @param options - File asset options including assetId and extension
 * @param project - Project details (projectId and dataset)
 * @returns The file URL
 *
 * @example
 * ```ts
 * const url = buildFileUrl(
 *   { assetId: 'abc123', extension: 'pdf' },
 *   { projectId: 'my-project', dataset: 'production' }
 * )
 * ```
 */
export function buildFileUrl(
  options: FileUrlBuilderOptions,
  project?: PathBuilderOptions,
): string {
  return buildFileUrlBase(options, project)
}

// Re-export utilities and types from @sanity/asset-utils
export {getFile, getFileAsset, tryGetFile, tryGetFileAsset}
export type {
  FileUrlBuilderOptions,
  PathBuilderOptions,
  ResolvedSanityFile,
  SanityFileAsset,
  SanityFileSource,
  SanityProjectDetails,
}
