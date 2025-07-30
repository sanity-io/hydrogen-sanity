import type {ClientPerspective} from '@sanity/client'

export function sanitizePerspective(_perspective: unknown): Exclude<ClientPerspective, 'raw'> {
  const perspective =
    typeof _perspective === 'string' && _perspective.includes(',')
      ? _perspective.split(',')
      : _perspective
  try {
    validateApiPerspective(perspective)
    return perspective === 'raw' ? 'drafts' : perspective
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Invalid perspective:`, _perspective, perspective, err)
    return 'drafts'
  }
}

/**
 * Lifted from https://github.com/sanity-io/client/blob/580a524f03408299e75d399adeb32403c258c3c2/src/config.ts#L34-L42,
 * inlined as importing from `@sanity/client` leads to issues with `process` globals
 */
function validateApiPerspective(perspective: unknown): asserts perspective is ClientPerspective {
  if (Array.isArray(perspective) && perspective.length > 1 && perspective.includes('raw')) {
    throw new TypeError(
      `Invalid API perspective value: "raw". The raw-perspective can not be combined with other perspectives`,
    )
  }
}
