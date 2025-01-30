/**
 * To keep the worker bundle size small, only load
 * the Studio and its configuration in the client
 */
import {Studio} from 'sanity'
import {config} from 'virtual:sanity-studio/config'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Sanity Studio can only run in the browser. Please check that this file is not being imported into a worker or server bundle.',
  )
}

function SanityStudio() {
  return (
    <div id="sanity" data-ui="StudioLayout">
      <Studio config={config} unstable_globalStyles />
    </div>
  )
}

// `React.lazy` expects the component as the default export
// @see https://react.dev/reference/react/lazy
export default SanityStudio
