import {constants} from 'node:fs'
import {access, readFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import type {Plugin} from 'vite'

async function findClosestPackageJson(): Promise<string | null> {
  // Start from the current module location and traverse upward
  let currentDir = dirname(fileURLToPath(import.meta.url))

  while (currentDir !== dirname(currentDir)) {
    // Stop at filesystem root
    const packageJsonPath = join(currentDir, 'package.json')
    try {
      await access(packageJsonPath, constants.F_OK)
      return packageJsonPath
    } catch {
      // File doesn't exist, continue traversing upward
    }
    currentDir = dirname(currentDir)
  }

  return null
}

async function isDirectDependency(packageName: string): Promise<boolean> {
  try {
    // Find the closest package.json starting from this plugin's location
    const packageJsonPath = await findClosestPackageJson()

    if (!packageJsonPath) {
      console.warn(`Could not find package.json starting from plugin location`)
      return false
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

    // Check if the package is listed as a direct dependency
    return !!(
      packageJson.dependencies?.[packageName] ||
      packageJson.devDependencies?.[packageName] ||
      packageJson.peerDependencies?.[packageName]
    )
  } catch (error) {
    // Fallback: if we can't read package.json, assume it's not a direct dependency
    console.warn(`Could not read package.json to check for ${packageName}:`, error)
    return false
  }
}

export function sanity(): Plugin {
  return {
    name: 'sanity',

    async config() {
      return {
        envPrefix: ['SANITY_STUDIO_'],
        ssr: {
          optimizeDeps: {
            include: [
              'hydrogen-sanity',
              ...((await isDirectDependency('@sanity/client')) ? ['@sanity/client'] : []),
            ],
          },
        },
      }
    },
  }
}
