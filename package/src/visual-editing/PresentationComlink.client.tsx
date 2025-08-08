import {useSubmit} from '@remix-run/react'
import {createNode, createNodeMachine} from '@sanity/comlink'
import {
  createCompatibilityActors,
  type LoaderControllerMsg,
  type LoaderNodeMsg,
} from '@sanity/presentation-comlink'
import {type ReactNode, useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'

import type {ClientPerspective} from '../client'

export type PresentationComlinkProps = {
  /**
   * The action URL path used to submit the new perspective.
   */
  action: string
}

export default function PresentationComlink({action}: PresentationComlinkProps): ReactNode {
  const submit = useSubmit()

  const handlePerspectiveChange = useEffectEvent((perspective: ClientPerspective) => {
    const formData = new FormData()
    formData.set('perspective', Array.isArray(perspective) ? perspective.join(',') : perspective)
    submit(formData, {
      method: 'PUT',
      action,
      navigate: false,
      preventScrollReset: true,
    })
  })

  useEffect(
    () => {
      const comlink = createNode<LoaderNodeMsg, LoaderControllerMsg>(
        {name: 'loaders', connectTo: 'presentation'},
        createNodeMachine<LoaderNodeMsg, LoaderControllerMsg>().provide({
          actors: createCompatibilityActors<LoaderNodeMsg>(),
        }),
      )

      comlink.on('loader/perspective', (data) => {
        handlePerspectiveChange(data.perspective)
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
