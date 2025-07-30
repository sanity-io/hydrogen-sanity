import {useSubmit} from '@remix-run/react'
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
  const submit = useSubmit()

  const handlePerspectiveChange = useEffectEvent(
    (perspective: ClientPerspective, signal: AbortSignal) => {
      // eslint-disable-next-line no-console
      console.log('handlePerspectiveChange', perspective, signal)
      const formData = new FormData()
      formData.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)
      submit(formData, {method: 'put', action: '/resource/preview', navigate: false})
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
