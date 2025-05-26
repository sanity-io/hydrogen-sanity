import {index, route, type RouteConfigEntry} from '@remix-run/route-config'

export type DefineStudioRouteOptions = {
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
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const {routePath = '/studio', filePath} = options

  try {
    // TODO: this should probably follow some file resolution conventions set by RR
    await fs.access(filePath)
  } catch (error) {
    throw new Error(`Studio route not found at: ${filePath}`)
  }

  const studioModule = path.resolve(filePath)
  return route(routePath, studioModule, [
    index(studioModule, {id: 'studio'}),
    route('*', studioModule, {id: 'studio-splat'}),
  ])
}
