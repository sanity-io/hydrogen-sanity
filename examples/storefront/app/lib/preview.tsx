import type {ReactNode} from 'react';
import {Query} from 'hydrogen-sanity';
import {usePreviewMode} from 'hydrogen-sanity/preview';

type SanityPreviewProps<T> = {
  data: T;
  query: string;
  params?: Record<string, unknown>;
  children: (value: T) => ReactNode;
};

export function SanityPreview<T>({
  data,
  query,
  params,
  children,
}: SanityPreviewProps<T>) {
  return (
    <Query query={query} params={params} options={{initial: data}}>
      {(value) => children(value)}
    </Query>
  );
}

export function usePreviewContext() {
  return usePreviewMode();
}
