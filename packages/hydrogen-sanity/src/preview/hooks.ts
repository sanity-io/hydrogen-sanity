import {useSanityProviderValue} from '../provider'

/**
 * Returns whether Sanity preview mode is currently enabled.
 */
export function usePreviewMode(): boolean {
  const providerValue = useSanityProviderValue()
  return Boolean(providerValue.previewEnabled)
}
