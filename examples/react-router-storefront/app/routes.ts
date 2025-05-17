import {type RouteConfig} from '@remix-run/route-config';
import {flatRoutes} from '@remix-run/fs-routes';
import {defineStudioRoute} from 'hydrogen-sanity/studio/utils';

const routes = [
  ...(await flatRoutes({rootDirectory: './routes'})),
  // TODO: this should match flat routes' discovery
  // await defineStudioRoute({
  //   filePath: './app/routes/studio.tsx',
  // }),
] satisfies RouteConfig;

export default routes;
