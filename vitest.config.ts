/// <reference types="vitest" />
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    isolate: false,
    setupFiles: ['./vitest.setup.ts'],
  },
})
