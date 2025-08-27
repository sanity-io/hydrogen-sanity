import {useSanityProviderValue} from '../provider'

export function usePreviewMode(): boolean {
  const providerValue = useSanityProviderValue()
  return providerValue.preview || false
}
