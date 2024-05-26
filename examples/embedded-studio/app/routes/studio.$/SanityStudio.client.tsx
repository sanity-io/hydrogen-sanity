/**
 * To keep the worker bundle size small, only load
 * the Studio and its configuration in the client
 */
import {type StudioProps, Studio, type SingleWorkspace} from 'sanity';
import {defineSanityConfig} from '~/sanity/config';

/**
 * Prevent a consumer from importing into a worker/server bundle.
 */
if (typeof document === 'undefined') {
  throw new Error(
    'Sanity Studio can only run in the browser. Please check that this file is not being imported into a worker or server bundle.',
  );
}

type SanityStudioProps = Omit<StudioProps, 'config'> &
  Pick<SingleWorkspace, 'projectId' | 'dataset' | 'basePath'>;

function SanityStudio(props: SanityStudioProps) {
  const {projectId, dataset, basePath, ...rest} = props;

  const config = defineSanityConfig({
    projectId,
    dataset,
    basePath,
  });

  return (
    <div id="sanity" data-ui="StudioLayout">
      <Studio {...rest} config={config} unstable_globalStyles />
    </div>
  );
}

// `React.lazy` expects the component as the default export
// @see https://react.dev/reference/react/lazy
export default SanityStudio;
