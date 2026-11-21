import {Suspense, use} from 'react'
import {renderToReadableStream} from 'react-dom/server'
import {expect, it} from 'vitest'

import {usePreviewMode} from './preview/hooks'
import {Sanity, SanityProvider, type SanityProviderValue} from './provider'

function providerValue(previewEnabled: boolean): SanityProviderValue {
  return {
    projectId: 'project',
    dataset: 'production',
    apiHost: 'https://api.sanity.io',
    apiVersion: '2025-02-19',
    perspective: previewEnabled ? 'drafts' : 'published',
    previewEnabled,
    stegaEnabled: previewEnabled,
  }
}

function PreviewFlag({ready}: {ready: Promise<void>}) {
  use(ready)
  return <p>{usePreviewMode() ? 'preview' : 'published'}</p>
}

it("doesn't leak preview mode between concurrent requests", async () => {
  let resolvePreview!: () => void
  const previewReady = new Promise<void>((resolve) => {
    resolvePreview = resolve
  })

  // A preview request suspends while a published request renders
  const previewStream = await renderToReadableStream(
    <SanityProvider value={providerValue(true)}>
      <Suspense fallback={null}>
        <PreviewFlag ready={previewReady} />
      </Suspense>
    </SanityProvider>,
  )
  const publishedStream = await renderToReadableStream(
    <SanityProvider value={providerValue(false)}>
      <Suspense fallback={null}>
        <PreviewFlag ready={Promise.resolve()} />
      </Suspense>
    </SanityProvider>,
  )
  const publishedHtml = await new Response(publishedStream).text()
  resolvePreview()
  const previewHtml = await new Response(previewStream).text()

  expect(publishedHtml).toContain('published')
  expect(previewHtml).toContain('>preview<')
})

it("doesn't let a provider value close the `<Sanity>` script", async () => {
  const value = {...providerValue(true), dataset: '</script><script>alert(1)</script>'}
  const stream = await renderToReadableStream(
    <SanityProvider value={value}>
      <Sanity />
    </SanityProvider>,
  )
  const html = await new Response(stream).text()

  expect(html.match(/<\/script>/g)).toHaveLength(1)
  expect(html).toContain('\\u003c/script>')
})
