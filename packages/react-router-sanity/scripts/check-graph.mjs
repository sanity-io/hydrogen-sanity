// Spec 7.1.1: static-graph assertion. Walks the static imports of each production entry in
// `dist` and fails when one reaches a deny-listed package. Dynamic `import()` edges do not count:
// they load only when the feature runs.
import {readFileSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {init, parse} from 'es-module-lexer'

import {isDenied, PROD_ENTRIES} from './harness.mjs'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
await init

function staticImports(file) {
  const [imports] = parse(readFileSync(file, 'utf8'))
  // es-module-lexer 3: `type` is 'static' for imports and re-exports, 'dynamic' for import().
  return imports.filter((entry) => entry.type === 'static' && entry.specifier).map((entry) => entry.specifier)
}

function dynamicImports(file) {
  const [imports] = parse(readFileSync(file, 'utf8'))
  return imports.filter((entry) => entry.type === 'dynamic' && entry.specifier).map((entry) => entry.specifier)
}

/** Returns every bare specifier that the entry reaches through static edges, with the path to it. */
function walk(entry) {
  const reached = new Map()
  const seen = new Set()
  const stack = [{file: join(dist, `${entry}.js`), path: [`${entry}.js`]}]
  while (stack.length > 0) {
    const {file, path} = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    for (const specifier of staticImports(file)) {
      if (specifier.startsWith('.')) {
        const next = resolve(dirname(file), specifier)
        stack.push({file: next, path: [...path, relative(dist, next)]})
      } else if (!reached.has(specifier)) {
        reached.set(specifier, path)
      }
    }
  }
  return reached
}

let failures = 0
for (const entry of PROD_ENTRIES) {
  const reached = walk(entry)
  const denied = [...reached].filter(([specifier]) => isDenied(specifier))
  if (denied.length === 0) {
    console.log(`ok    ${entry}  (${[...reached.keys()].join(', ') || 'no packages'})`)
    continue
  }
  failures += denied.length
  for (const [specifier, path] of denied) {
    console.error(`FAIL  ${entry} reaches ${specifier} via ${path.join(' -> ')}`)
  }
}

// Positive controls: the walker must see the deny-listed packages that preview code loads.
// Without these, a lexer change can make the check pass on nothing.
const controls = [
  {entry: 'preview/route', expect: '@sanity/preview-url-secret'},
  {entry: 'optimistic/index', expect: '@sanity/visual-editing/react'},
]
for (const control of controls) {
  if (walk(control.entry).has(control.expect)) {
    console.log(`ok    control: ${control.entry} reaches ${control.expect}`)
  } else {
    console.error(`FAIL  control: ${control.entry} must reach ${control.expect}. The walker is broken.`)
    failures++
  }
}
// The lazy overlay chunk must stay behind a dynamic import of the eager wrapper.
const lazy = dynamicImports(join(dist, 'visual-editing/index.js'))
const lazyReaches = lazy.flatMap((specifier) => [...walk(relative(dist, resolve(dist, 'visual-editing', specifier)).replace(/\.js$/, '')).keys()])
if (lazyReaches.includes('@sanity/visual-editing/react-router')) {
  console.log('ok    control: visual-editing loads @sanity/visual-editing/react-router through import() only')
} else {
  console.error('FAIL  control: the lazy visual-editing chunk must reach @sanity/visual-editing/react-router')
  failures++
}

if (failures > 0) {
  console.error(`\n${failures} failure(s) in the static graph check.`)
  process.exit(1)
}
console.log(`\nStatic graph clean for ${PROD_ENTRIES.length} production entries.`)
