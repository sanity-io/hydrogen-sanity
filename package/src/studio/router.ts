import {access} from 'node:fs/promises'
import {resolve} from 'node:path'

import {index, route, type RouteConfigEntry} from '@remix-run/route-config'

/**
 * Define a route for the embedded Sanity Studio.
 * @param path - The path where the studio should be mounted (e.g. '/studio')
 * @param filePath - The path to the studio module file
 * @returns A route configuration for the studio
 * @throws Error if the file does not exist
 */
export async function defineStudioRoute({
  routePath = '/studio',
  filePath,
}: {
  routePath?: string
  filePath: string
}): Promise<RouteConfigEntry> {
  try {
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
