import {Studio} from 'sanity'
import config from 'virtual:sanity/config'

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Studio should only run client-side. Please check that this file is not being imported into a worker or server bundle.',
  )
}

export default Studio.bind(null, {config})
