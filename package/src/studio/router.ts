import {access} from 'node:fs/promises'
import {resolve} from 'node:path'

import {index, route, type RouteConfigEntry} from '@remix-run/route-config'

type DefineStudioRouteOptions = {
  /**
   * The path where the studio should be mounted (e.g. '/studio').
   */
  routePath?: string

  /**
   * The path to the studio module file.
   */
  filePath: string
}

/**
 * Define a route for an embedded Sanity Studio.
 * @returns A route configuration for Studio
 * @throws Error if the file does not exist
 */
export async function defineStudioRoute(
  options: DefineStudioRouteOptions,
): Promise<RouteConfigEntry> {
  const {routePath = '/studio', filePath} = options

  try {
    // TODO: this should probably follow some file resolution conventions set by RR
    await access(filePath)
  } catch (error) {
    throw new Error(`Studio route not found at: ${filePath}`)
  }

  const studioModule = resolve(filePath)
  return route(routePath, studioModule, [
    index(studioModule, {id: 'studio'}),
    route('*', studioModule, {id: 'studio-splat'}),
  ])
}
