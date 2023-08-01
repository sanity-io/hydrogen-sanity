import {useLoaderData} from '@remix-run/react';
import {
  defer,
  type LoaderArgs,
  type SerializeFrom,
} from '@shopify/remix-oxygen';
import {SanityPreview} from 'hydrogen-sanity';

export async function loader({context, params}: LoaderArgs) {
  const nil = await context.sanity.query<null>({
    query: `null`,
  });

  return defer({
    nil,
  });
}

export default function Index() {
  const {nil} = useLoaderData<SerializeFrom<typeof loader>>();

  return (
    <SanityPreview data={nil} query={`null`}>
      {() => <></>}
    </SanityPreview>
  );
}
