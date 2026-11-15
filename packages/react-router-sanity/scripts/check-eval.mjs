// Spec 7.1.2: module-evaluation probe. Imports each production entry in a fresh Node process with a
// resolve hook, and fails when a deny-listed module is evaluated. This check also catches a
// bundler or a re-export that turns a lazy edge into an eager one.
import {spawnSync} from 'node:child_process'
import {dirname, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

import {DENY_LIST, PROD_ENTRIES} from './harness.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Entries that route modules and `root.tsx` import in the browser. */
const BROWSER_EAGER = ['index', 'preview/index', 'visual-editing/index', 'live/index', 'image/index']

// The child records every module URL that Node resolves, then imports the entry.
const probe = `
import {registerHooks} from 'node:module'
const resolved = new Set()
registerHooks({
  resolve(specifier, context, next) {
    const result = next(specifier, context)
    resolved.add(result.url)
    return result
  },
})
await import(process.argv[1])
console.log(JSON.stringify([...resolved]))
`

function packageOf(url) {
  const match = url.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)
  return match ? match[match.length - 1].replace('node_modules/', '') : undefined
}

/** Returns the packages that an entry evaluates, or an error text. */
function evaluate(entry) {
  const target = pathToFileURL(resolve(root, 'dist', `${entry}.js`)).href
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', probe, target], {
    cwd: root,
    encoding: 'utf8',
  })
  if (child.status !== 0) return {error: child.stderr}
  const urls = JSON.parse(child.stdout.trim().split('\n').pop())
  return {packages: [...new Set(urls.map(packageOf).filter(Boolean))].sort()}
}

let failures = 0

// Positive control: the probe must see what preview code evaluates.
const control = evaluate('preview/route')
if (control.packages?.includes('@sanity/preview-url-secret')) {
  console.log('ok    control: preview/route evaluates @sanity/preview-url-secret')
} else {
  console.error(`FAIL  control: preview/route must evaluate @sanity/preview-url-secret. The probe is broken.\n${control.error ?? ''}`)
  failures++
}

for (const entry of PROD_ENTRIES) {
  const result = evaluate(entry)
  if (result.error) {
    console.error(`FAIL  ${entry} did not evaluate:\n${result.error}`)
    failures++
    continue
  }
  const {packages} = result
  const denied = packages.filter((name) => DENY_LIST.some((d) => name === d || name.startsWith(d)))
  // Entries that every page imports in the browser must not evaluate the full client either.
  if (BROWSER_EAGER.includes(entry) && packages.includes('@sanity/client')) denied.push('@sanity/client')
  if (denied.length > 0) {
    console.error(`FAIL  ${entry} evaluated ${denied.join(', ')}`)
    failures++
  } else {
    console.log(`ok    ${entry}  evaluated ${packages.length} package(s): ${packages.join(', ') || '-'}`)
  }
}

if (failures > 0) process.exit(1)
console.log(`\nNo deny-listed module evaluated by ${PROD_ENTRIES.length} production entries.`)
