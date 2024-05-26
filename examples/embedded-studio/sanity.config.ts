/**
 * This file is used by the Sanity CLI to load the project configuration.
 * @example `sanity schema extract`
 *
 * @see https://www.sanity.io/docs/cli
 *
 * NOTE: Sanity CLI will load environment variables
 */
import {defineSanityConfig} from '~/sanity/config';

export default defineSanityConfig({
  // @ts-expect-error
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  // @ts-expect-error
  dataset: process.env.PUBLIC_SANITY_DATASET,
});
