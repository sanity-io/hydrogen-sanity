import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    name: 'react-router-sanity',
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
