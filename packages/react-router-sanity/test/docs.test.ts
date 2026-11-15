import {existsSync, readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('agent docs contract', () => {
  it('has a docs page for every error code', () => {
    const codes = [...read('src/errors.ts').matchAll(/^\s*RRS(\d{3}):/gm)].map((match) => `RRS${match[1]}`)
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) expect(existsSync(resolve(root, `docs/errors/${code}.md`)), code).toBe(true)
  })

  it('links only to files that exist and ship in the package', () => {
    const files: string[] = JSON.parse(read('package.json')).files
    for (const [, target] of read('llms.txt').matchAll(/\]\(([^)]+)\)/g)) {
      if (!target) continue
      expect(existsSync(resolve(root, target)), target).toBe(true)
      expect(
        files.some((entry) => target === entry || target.startsWith(`${entry}/`)),
        `${target} is in package.json files`,
      ).toBe(true)
    }
  })

  it('lists every public entry in llms.txt', () => {
    const exports = Object.keys(JSON.parse(read('package.json')).exports).filter((key) => key !== './package.json')
    const llms = read('llms.txt')
    for (const subpath of exports) {
      const name = subpath === '.' ? 'react-router-sanity' : `react-router-sanity/${subpath.slice(2)}`
      expect(llms, name).toContain(`\`${name}\``)
    }
  })
})
