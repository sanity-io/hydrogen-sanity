/// <reference types="vitest" />
import {defineConfig} from 'vitest/config'
import GithubActionsReporter from 'vitest-github-actions-reporter'

export default defineConfig({
  test: {
    isolate: false,
    setupFiles: ['./vitest.setup.ts'],
    // Enable rich PR failed test annotation on the CI
    // eslint-disable-next-line no-process-env
    reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : 'default',
  },
})
