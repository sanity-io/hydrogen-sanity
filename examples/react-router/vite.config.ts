import {gzipSync} from 'node:zlib'

import {reactRouter} from '@react-router/dev/vite'
import {defineConfig, type Plugin} from 'vite'

/** Returns the npm package of a module id, or `undefined` for app code. */
function packageOf(id: string): string | undefined {
  if (id.includes('/packages/react-router-sanity/')) return 'react-router-sanity'
  const match = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)(?!.*node_modules)/)
  return match?.[1]
}

/**
 * Writes `build/client/module-map.json`: for each client chunk, the packages it contains and the
 * gzip size of its Sanity code. The E2E bundle checks (spec 7.2) read this file.
 */
function moduleMap(): Plugin {
  return {
    name: 'react-router-sanity:module-map',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (this.environment.name !== 'client') return
      const map: Record<string, {packages: string[]; sanityGzip: number; byPackage: Record<string, number>}> = {}
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk') continue
        const packages = new Set<string>()
        const code = new Map<string, string>()
        for (const [id, rendered] of Object.entries(output.modules)) {
          const name = packageOf(id)
          if (!name) continue
          packages.add(name)
          if (name === 'react-router-sanity' || name.startsWith('@sanity/')) {
            code.set(name, (code.get(name) ?? '') + (rendered.code ?? ''))
          }
        }
        const all = [...code.values()].join('')
        map[fileName] = {
          packages: [...packages].sort(),
          sanityGzip: all ? gzipSync(all).length : 0,
          byPackage: Object.fromEntries([...code].map(([name, text]) => [name, gzipSync(text).length])),
        }
      }
      this.emitFile({type: 'asset', fileName: 'module-map.json', source: JSON.stringify(map, null, 2)})
    },
  }
}

export default defineConfig({
  plugins: [reactRouter(), moduleMap()],
})
