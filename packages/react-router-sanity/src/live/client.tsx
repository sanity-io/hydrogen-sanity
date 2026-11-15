'use client'
import {CorsOriginError, createClient, type LiveEvent} from '@sanity/client'
import {useEffect, useEffectEvent} from 'react'
import {useMatches, useRevalidator} from 'react-router'

import {useSanityRootData} from '../preview/index'
import type {SanityLiveProps} from './index'
import {collectSyncTags, eventTouchesPage} from './tags'

/** Must match `LIVE_EVENT_COOKIE` in `server/middleware.ts`. */
const LIVE_EVENT_COOKIE = '__sanity_live_event'
const FALLBACK_POLL_MS = 30_000

function setLiveEventCookie(id: string | undefined): void {
  document.cookie = id
    ? `${LIVE_EVENT_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=10; SameSite=Lax`
    : `${LIVE_EVENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

/**
 * Loads after hydration. Holds the event stream and revalidates matching routes.
 *
 * @internal
 */
export default function SanityLiveClient({includeDrafts = false, onError}: SanityLiveProps): null {
  const root = useSanityRootData()
  const matches = useMatches()
  const revalidator = useRevalidator()

  const revalidate = useEffectEvent(async (lastLiveEventId?: string) => {
    // Without a Sync Tag Invalidate Function, the server must skip the app cache and ask the API
    // CDN for content at least as new as the event. A short-lived cookie carries the event id on
    // the revalidation request only.
    if (lastLiveEventId && !root?.live.waitFor) setLiveEventCookie(lastLiveEventId)
    try {
      await revalidator.revalidate()
    } finally {
      if (lastLiveEventId) setLiveEventCookie(undefined)
    }
  })

  const handleEvent = useEffectEvent((event: LiveEvent, stopPolling: () => void, startPolling: () => void) => {
    switch (event.type) {
      case 'welcome':
        stopPolling()
        return
      case 'message': {
        const pageTags = collectSyncTags(matches.map((match) => match.loaderData))
        if (eventTouchesPage(event.tags, pageTags)) void revalidate(event.id)
        return
      }
      case 'restart':
        void revalidate()
        return
      case 'reconnect':
        return
      case 'goaway':
        startPolling()
        return
    }
  })

  const handleError = useEffectEvent((error: unknown) => {
    if (error instanceof CorsOriginError) {
      console.warn(
        `[react-router-sanity] The Live Content API rejected this origin. Add it as a CORS origin: ${error.addOriginUrl ?? 'https://www.sanity.io/manage'}`,
      )
    }
    onError?.(error)
  })

  const projectId = root?.projectId
  const dataset = root?.dataset
  const apiVersion = root?.apiVersion
  const apiHost = root?.apiHost
  const useProjectHostname = root?.useProjectHostname
  const previewEnabled = root?.preview.enabled ?? false
  const browserToken = root?.browserToken
  const waitFor = root?.live.waitFor
  // Live drafts apply only in preview. Outside preview, `includeDrafts` falls back to published
  // events, so public visitors keep live updates.
  const drafts = includeDrafts && previewEnabled

  useEffect(() => {
    if (!projectId || !dataset || !apiVersion) return
    // In preview, Presentation refresh events revalidate the page. Live drafts are opt-in.
    if (previewEnabled && !drafts) return
    if (drafts && !browserToken) {
      console.warn(
        '[react-router-sanity] <SanityLive includeDrafts> needs `preview.browserToken` in the middleware config. Live drafts are off.',
      )
      return
    }

    const client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      ...(apiHost ? {apiHost} : {}),
      ...(useProjectHostname === false ? {useProjectHostname: false} : {}),
      ...(drafts && browserToken ? {token: browserToken, ignoreBrowserTokenWarning: true} : {}),
    })

    let closed = false
    let attempt = 0
    let poll: ReturnType<typeof setInterval> | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let subscription: {unsubscribe(): void} | undefined

    const stopPolling = () => {
      if (poll) clearInterval(poll)
      poll = undefined
    }
    const startPolling = () => {
      // Poll only while the tab is visible. A hidden tab revalidates when it becomes visible.
      poll ??= setInterval(() => {
        if (document.visibilityState === 'visible') void revalidate()
      }, FALLBACK_POLL_MS)
    }
    const connect = () => {
      subscription = client.live
        .events({includeDrafts: drafts, tag: 'react-router-sanity.live', ...(waitFor ? {waitFor} : {})})
        .subscribe({
          next: (event) => {
            if (event.type === 'welcome') attempt = 0
            handleEvent(event, stopPolling, startPolling)
          },
          error: (error: unknown) => {
            handleError(error)
            // The stream is closed after an error. Poll as a fallback, and reconnect with backoff:
            // 1 s, 2 s, 4 s … up to 60 s. A `welcome` event on the new stream stops the polling.
            startPolling()
            if (closed) return
            const delay = Math.min(60_000, 1_000 * 2 ** attempt)
            attempt += 1
            retry = setTimeout(connect, delay)
          },
        })
    }
    connect()

    return () => {
      closed = true
      subscription?.unsubscribe()
      if (retry) clearTimeout(retry)
      stopPolling()
    }
  }, [projectId, dataset, apiVersion, apiHost, useProjectHostname, previewEnabled, drafts, browserToken, waitFor])

  return null
}
