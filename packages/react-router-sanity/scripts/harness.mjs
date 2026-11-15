// Shared facts for the harness scripts: which entries production code can evaluate, and which
// packages those entries must never reach. Spec section 4.1 ("Prod") and section 7.1.

/** Packages that only preview, Presentation or media code may load. */
export const DENY_LIST = [
  '@sanity/visual-editing',
  '@sanity/react-loader',
  '@sanity/core-loader',
  '@sanity/comlink',
  '@sanity/presentation-comlink',
  '@sanity/visual-editing-csm',
  '@sanity/preview-url-secret',
  '@mux/',
]

/**
 * Entries whose static graph a production request evaluates. Client entries count too: their
 * eager wrapper ships to every visitor, so it must reach nothing on the deny list.
 */
export const PROD_ENTRIES = [
  'index',
  'server/index',
  'cache/index',
  'preview/index',
  'preview/server',
  'csp/index',
  'visual-editing/index',
  'live/index',
  'live/function',
  'image/index',
]

/** Entries that only preview or opt-in features load. The graph check skips them. */
export const PREVIEW_ENTRIES = ['preview/route', 'optimistic/index', 'live/route', 'testing/index']

/** Every public subpath, its server-only flag and its client-component flag. */
export const SUBPATHS = [
  {subpath: '.', file: 'index', serverOnly: false, client: false},
  {subpath: './server', file: 'server/index', serverOnly: true, client: false},
  {subpath: './cache', file: 'cache/index', serverOnly: true, client: false},
  {subpath: './preview/route', file: 'preview/route', serverOnly: true, client: false},
  {subpath: './preview', file: 'preview/index', serverOnly: false, client: false},
  {subpath: './visual-editing', file: 'visual-editing/index', serverOnly: false, client: true},
  {subpath: './optimistic', file: 'optimistic/index', serverOnly: false, client: true},
  {subpath: './live', file: 'live/index', serverOnly: false, client: true},
  {subpath: './live/route', file: 'live/route', serverOnly: true, client: false},
  {subpath: './live/function', file: 'live/function', serverOnly: false, client: false},
  {subpath: './image', file: 'image/index', serverOnly: false, client: false},
  {subpath: './csp', file: 'csp/index', serverOnly: true, client: false},
  {subpath: './testing', file: 'testing/index', serverOnly: false, client: false},
]

export function isDenied(specifier) {
  return DENY_LIST.some((denied) => specifier === denied || specifier.startsWith(denied.endsWith('/') ? denied : `${denied}/`))
}
