import type {
  MediaLibraryAssetInstanceIdentifier,
  MediaLibraryPlaybackInfoOptions,
  VideoPlaybackInfo,
  VideoPlaybackInfoPublic,
  VideoPlaybackInfoSigned,
} from '@sanity/client'
import {useCallback, useEffect, useMemo, useState} from 'react'

import {useSanityProviderValue} from './provider'
import {supportsMediaLibraryVideo} from './utils'

export {getPlaybackTokens, isSignedPlaybackInfo} from '@sanity/client/media-library'

/**
 * Options for fetching video playback info
 */
export interface VideoPlaybackInfoOptions extends MediaLibraryPlaybackInfoOptions {
  /** Sanity project configuration */
  projectId: string
  dataset: string
  apiHost?: string
  apiVersion: string
}

/**
 * Options for the useVideoPlaybackInfo hook
 */
export interface UseVideoPlaybackInfoOptions extends MediaLibraryPlaybackInfoOptions {
  /** Skip fetching playback info (useful for conditional rendering) */
  skip?: boolean
}

/**
 * Return type for useVideoPlaybackInfo hook
 */
export interface UseVideoPlaybackInfoResult {
  /** The video playback info data, null while loading or if skipped */
  data: VideoPlaybackInfo | null
  /** Whether the hook is currently loading data */
  loading: boolean
  /** Error if the fetch failed */
  error: Error | null
  /** Refetch the playback info */
  refetch: () => void
}

/**
 * Fetch video playback info for a Sanity Media Library video asset.
 * Returns a promise that can be used with React 19's `use()` hook or awaited directly.
 *
 * @param asset - Asset identifier (reference, GDR string, or video-prefixed ID)
 * @param options - Project configuration and playback options
 * @returns Promise resolving to video playback info
 *
 * @example
 * ```tsx
 * // React 19+ with use() hook
 * import { use } from 'react'
 * import { fetchVideoPlaybackInfo } from 'hydrogen-sanity'
 *
 * function VideoPlayer({ asset, config }) {
 *   const playbackInfo = use(fetchVideoPlaybackInfo(asset, config))
 *   return <MuxPlayer playbackId={playbackInfo.id} />
 * }
 *
 * // Or await directly in loaders/actions
 * const playbackInfo = await fetchVideoPlaybackInfo(asset, {
 *   projectId: 'my-project',
 *   dataset: 'production',
 *   apiVersion: 'v2025-03-25',
 * })
 * ```
 */
export async function fetchVideoPlaybackInfo(
  asset: MediaLibraryAssetInstanceIdentifier,
  options: VideoPlaybackInfoOptions,
): Promise<VideoPlaybackInfo> {
  const {projectId, dataset, apiHost, apiVersion, ...playbackOptions} = options

  if (!supportsMediaLibraryVideo(apiVersion)) {
    throw new Error(
      `API version ${apiVersion} does not support Media Library video. Use v2025-03-25 or later.`,
    )
  }

  const {createClient} = await import('@sanity/client')
  const client = createClient({
    projectId,
    dataset,
    apiHost,
    apiVersion,
    useCdn: true,
  })

  return client.mediaLibrary.video.getPlaybackInfo(asset, playbackOptions)
}

/**
 * Hook that returns a function to fetch video playback info.
 * The returned function uses the current Sanity provider configuration.
 * Useful for React 19's `use()` hook or manual promise handling.
 *
 * @returns A function that takes an asset and returns a Promise<VideoPlaybackInfo>
 *
 * @example
 * ```tsx
 * // React 19+ with use() hook
 * import { use } from 'react'
 * import { useVideoPlaybackInfoFetcher } from 'hydrogen-sanity'
 *
 * function VideoPlayer({ asset }) {
 *   const fetchPlaybackInfo = useVideoPlaybackInfoFetcher()
 *   const playbackInfo = use(fetchPlaybackInfo(asset))
 *   return <MuxPlayer playbackId={playbackInfo.id} />
 * }
 * ```
 */
export function useVideoPlaybackInfoFetcher(): (
  asset: MediaLibraryAssetInstanceIdentifier,
  options?: MediaLibraryPlaybackInfoOptions,
) => Promise<VideoPlaybackInfo> {
  const {projectId, dataset, apiHost, apiVersion} = useSanityProviderValue()

  return useCallback(
    (asset: MediaLibraryAssetInstanceIdentifier, options?: MediaLibraryPlaybackInfoOptions) => {
      return fetchVideoPlaybackInfo(asset, {
        projectId,
        dataset,
        apiHost,
        apiVersion,
        ...options,
      })
    },
    [projectId, dataset, apiHost, apiVersion],
  )
}

/**
 * Hook that fetches video playback info for a Sanity Media Library video asset.
 * The hook is reactive - when the asset changes, it will refetch the playback info.
 * This makes it work seamlessly with live preview mode where document data may update.
 *
 * For React 19+, consider using `useVideoPlaybackInfoFetcher()` with the `use()` hook instead.
 *
 * @param asset - Asset identifier (reference, ID, or null/undefined to skip)
 * @param options - Options including skip flag and playback transformations
 * @returns Object containing data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * import { useVideoPlaybackInfo } from 'hydrogen-sanity'
 * import MuxPlayer from '@mux/mux-player-react'
 *
 * function VideoPlayer({ asset }) {
 *   const { data, loading, error } = useVideoPlaybackInfo(asset)
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error || !data) return null
 *
 *   return (
 *     <MuxPlayer
 *       playbackId={data.id}
 *       customDomain="m.sanity-cdn.com"
 *       style={{ aspectRatio: data.aspectRatio }}
 *     />
 *   )
 * }
 * ```
 */
export function useVideoPlaybackInfo(
  asset: MediaLibraryAssetInstanceIdentifier | null | undefined,
  options?: UseVideoPlaybackInfoOptions,
): UseVideoPlaybackInfoResult {
  const {projectId, dataset, apiHost, apiVersion} = useSanityProviderValue()
  const [data, setData] = useState<VideoPlaybackInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {skip = false, ...playbackOptions} = options ?? {}

  // Serialize asset identifier for dependency comparison
  const assetKey = typeof asset === 'string' ? asset : asset?._ref ?? null

  // Memoize playback options to prevent unnecessary refetches
  const serializedPlaybackOptions = useMemo(
    () => JSON.stringify(playbackOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(playbackOptions)],
  )

  const doFetch = useCallback(async () => {
    if (!assetKey || skip) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!supportsMediaLibraryVideo(apiVersion)) {
      setError(
        new Error(
          `API version ${apiVersion} does not support Media Library video. Use v2025-03-25 or later.`,
        ),
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const playbackInfo = await fetchVideoPlaybackInfo(assetKey, {
        projectId,
        dataset,
        apiHost,
        apiVersion,
        ...JSON.parse(serializedPlaybackOptions),
      })
      setData(playbackInfo)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [assetKey, skip, projectId, dataset, apiHost, apiVersion, serializedPlaybackOptions])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  return {data, loading, error, refetch: doFetch}
}

/**
 * Sanity video asset source type.
 * Can be a video asset reference, a GDR string, or a video-prefixed ID.
 */
export type SanityVideoSource = MediaLibraryAssetInstanceIdentifier | null | undefined

// Re-export types from @sanity/client
export type {
  MediaLibraryAssetInstanceIdentifier,
  MediaLibraryPlaybackInfoOptions,
  VideoPlaybackInfo,
  VideoPlaybackInfoPublic,
  VideoPlaybackInfoSigned,
}
