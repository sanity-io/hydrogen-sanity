import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'server-only': 'src/server-only.ts',
    'server/index': 'src/server/index.ts',
    'cache/index': 'src/cache/index.ts',
    'preview/index': 'src/preview/index.ts',
    'preview/server': 'src/preview/server.ts',
    'preview/route': 'src/preview/route.ts',
    'visual-editing/index': 'src/visual-editing/index.tsx',
    'optimistic/index': 'src/optimistic/index.ts',
    'live/index': 'src/live/index.tsx',
    'live/route': 'src/live/route.ts',
    'live/function': 'src/live/function.ts',
    'image/index': 'src/image/index.tsx',
    'csp/index': 'src/csp/index.ts',
    'testing/index': 'src/testing/index.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'es2023',
  dts: true,
  sourcemap: true,
  clean: true,
  // Keep peer and runtime dependencies external. The consumer's bundler resolves them.
  external: [/^@sanity\//, /^react/, 'groq'],
  inputOptions: {
    // Rolldown warns about 'use client'. The directive survives on entry chunks.
    // scripts/check-conditions.mjs asserts it on every client entry.
    onLog(level, log, handler) {
      if (log.code === 'MODULE_LEVEL_DIRECTIVE') return
      handler(level, log)
    },
  },
})
