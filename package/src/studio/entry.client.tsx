import {Layout} from 'hydrogen-sanity/studio'
import {startTransition, StrictMode} from 'react'
import {hydrateRoot} from 'react-dom/client'

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <Layout />
    </StrictMode>,
  )
})
