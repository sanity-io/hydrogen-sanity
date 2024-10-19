/// <reference types="vitest" />
import {defineProject} from 'vitest/config'
import GithubActionsReporter from 'vitest-github-actions-reporter'

export default defineProject({
  test: {
    isolate: false,
    setupFiles: ['./vitest.setup.ts'],
    // Enable rich PR failed test annotation on the CI
    reporters: process.env.GITHUB_ACTIONS ? ['default', new GithubActionsReporter()] : 'default',
  },
})
