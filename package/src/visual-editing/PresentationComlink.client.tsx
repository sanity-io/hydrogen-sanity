import type {ClientPerspective} from '@sanity/client'
import {createNode, createNodeMachine} from '@sanity/comlink'
import {
  createCompatibilityActors,
  type LoaderControllerMsg,
  type LoaderNodeMsg,
} from '@sanity/presentation-comlink'
import {type JSX, useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'

export default function PresentationComlink(): JSX.Element | null {
  const handlePerspectiveChange = useEffectEvent(
    (perspective: ClientPerspective, signal: AbortSignal) => {
      // eslint-disable-next-line no-console
      console.log('handlePerspectiveChange', perspective, signal)
    },
  )

  useEffect(
    () => {
      const comlink = createNode<LoaderNodeMsg, LoaderControllerMsg>(
        {
          name: 'loaders',
          connectTo: 'presentation',
        },
        createNodeMachine<LoaderNodeMsg, LoaderControllerMsg>().provide({
          actors: createCompatibilityActors<LoaderNodeMsg>(),
        }),
      )

      let controller: AbortController | undefined
      comlink.on('loader/perspective', (data) => {
        controller?.abort()
        controller = new AbortController()
        handlePerspectiveChange(data.perspective, controller.signal)
      })

      const stop = comlink.start()
      return () => {
        stop()
      }
    },
    // useEffectEvent should never be in the deps array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return null
}
