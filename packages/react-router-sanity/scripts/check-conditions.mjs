// Spec 7.1.5: condition-resolution matrix. For each public subpath and each condition set, resolve
// the subpath through the package `exports` (self-reference) and import it in a fresh Node process.
//
// Assertions:
// - server-only subpaths throw RRS001 under `browser`;
// - every other combination imports without error;
// - client-component entries keep a top-of-file 'use client' directive;
// - no module that resolves under `react-server` imports hooks or `react-dom/client`.
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {init, parse} from 'es-module-lexer'

import {SUBPATHS} from './harness.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
await init

/** `default` covers SSR in Node; `workerd` covers Cloudflare and Oxygen. */
const CONDITIONS = ['default', 'browser', 'react-server', 'workerd']

function specifierFor(subpath) {
  return subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`
}

function run(condition, specifier, mode) {
  const args = condition === 'default' ? [] : [`--conditions=${condition}`]
  const source =
    mode === 'resolve'
      ? `console.log(import.meta.resolve(${JSON.stringify(specifier)}).split('/dist/')[1] ?? '')`
      : `const m = await import(${JSON.stringify(specifier)}); console.log(Object.keys(m).sort().join(','))`
  return spawnSync(process.execPath, [...args, '--input-type=module', '-e', source], {cwd: root, encoding: 'utf8'})
}

/**
 * Tells if Node can evaluate the cell, or only resolve it.
 *
 * - `react-server`: `react-router` loads its own 'use client' module under this condition. Only
 *   an RSC bundler can evaluate it, so Node checks resolution. The RSC example app evaluates it.
 * - `browser` on client entries: upstream visual editing imports CSS, which only a bundler loads.
 */
function modeFor(condition, client) {
  if (condition === 'react-server') return 'resolve'
  if (condition === 'browser' && client) return 'resolve'
  return 'import'
}

/** Resolves the file that a subpath maps to under one condition, from the `exports` map. */
function resolveFile(subpath, condition) {
  const target = pkg.exports[subpath]
  if (typeof target === 'string') return target
  for (const [key, value] of Object.entries(target)) {
    if (key === 'types') continue
    if (key === condition || key === 'default') return value
  }
  return undefined
}

let failures = 0
const fail = (message) => {
  failures++
  console.error(`FAIL  ${message}`)
}

for (const {subpath, serverOnly, client} of SUBPATHS) {
  const specifier = specifierFor(subpath)
  for (const condition of CONDITIONS) {
    // A real RSC bundler replaces 'use client' modules with client references, so they never
    // evaluate under `react-server`. Check the directive instead of importing them.
    if (condition === 'react-server' && client) continue
    const mode = modeFor(condition, client)
    const child = run(condition, specifier, mode)
    const label = `${specifier} [${condition}]`
    if (serverOnly && condition === 'browser') {
      if (child.status !== 0 && child.stderr.includes('RRS001')) console.log(`ok    ${label} throws RRS001`)
      else fail(`${label} must throw RRS001, got status ${child.status}\n${child.stderr}`)
    } else if (mode === 'resolve') {
      const expected = resolveFile(subpath, condition)?.replace('./dist/', '')
      const actual = child.stdout.trim()
      if (child.status === 0 && actual === expected) console.log(`ok    ${label} resolves ${actual}`)
      else fail(`${label} must resolve ${expected}, got ${actual || child.stderr}`)
    } else if (child.status === 0) {
      console.log(`ok    ${label} -> ${child.stdout.trim() || '(no exports)'}`)
    } else {
      fail(`${label} did not import:\n${child.stderr.split('\n').slice(0, 6).join('\n')}`)
    }
  }

  if (client) {
    const file = resolve(root, resolveFile(subpath, 'default'))
    const first = readFileSync(file, 'utf8').split('\n')[0]
    if (/^["']use client["'];?$/.test(first)) console.log(`ok    ${specifier} keeps 'use client'`)
    else fail(`${specifier} lost its 'use client' directive (${file})`)
  } else {
    const problems = reactServerProblems(resolve(root, resolveFile(subpath, 'react-server')))
    for (const problem of problems) fail(`${specifier} ${problem} under react-server`)
    if (problems.length === 0) console.log(`ok    ${specifier} reaches no hooks under react-server`)
  }
}

/**
 * Walks the static graph of a file, shared chunks included, and returns every hook import from
 * `react` or `react-router`, and every `react-dom/client` import.
 */
function reactServerProblems(entryFile) {
  const problems = []
  const seen = new Set()
  const stack = [entryFile]
  while (stack.length > 0) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    const [imports] = parse(source)
    for (const entry of imports) {
      if (entry.type !== 'static' || !entry.specifier) continue
      if (entry.specifier.startsWith('.')) {
        stack.push(resolve(dirname(file), entry.specifier))
        continue
      }
      if (entry.specifier === 'react-dom/client') problems.push('imports react-dom/client')
      if (!['react', 'react-router'].includes(entry.specifier)) continue
      const hooks = source.slice(entry.importStart, entry.importEnd).match(/\buse[A-Z]\w*/g)
      if (hooks) problems.push(`imports ${hooks.join(', ')} (in ${file.split('/dist/')[1]})`)
    }
  }
  return problems
}

// Positive control: the default `preview` entry uses `useRouteLoaderData`. The walker must find it.
if (reactServerProblems(resolve(root, 'dist/preview/index.js')).some((p) => p.includes('useRouteLoaderData'))) {
  console.log('ok    control: the hook walker finds useRouteLoaderData in preview/index.js')
} else {
  fail('control: the hook walker must find useRouteLoaderData in preview/index.js. The walker is broken.')
}

if (failures > 0) {
  console.error(`\n${failures} failure(s) in the condition matrix.`)
  process.exit(1)
}
console.log(`\nCondition matrix green: ${SUBPATHS.length} subpaths x ${CONDITIONS.length} condition sets.`)
