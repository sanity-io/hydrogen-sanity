import {useFetchers} from 'react-router';
import {CartForm} from '@shopify/hydrogen';

export function useCartFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher?.formData;
    if (formData) {
      const formInputs = CartForm.getFormInput(formData);
      if (formInputs.action === actionName) {
        cartFetchers.push(fetcher);
      }
    }
  }
  return cartFetchers;
}
