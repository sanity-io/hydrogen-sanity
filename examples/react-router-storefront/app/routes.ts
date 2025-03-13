import {route, type RouteConfig} from '@remix-run/route-config';
import {flatRoutes} from '@remix-run/fs-routes';

const routes = [
  ...(await flatRoutes({rootDirectory: './routes'})),
] satisfies RouteConfig;

export default routes;
