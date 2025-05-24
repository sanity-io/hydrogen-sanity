import {defineProject} from 'vitest/config'

export default defineProject({
  test: {
    isolate: false,
    setupFiles: ['./vitest.setup.ts'],
  },
})
