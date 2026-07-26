// lint-staged runs from the repo root, where this package's oxfmt/oxlint binaries are not on
// PATH. `pnpm --filter` resolves them and sets the cwd so the package's own config files apply.
const oxfmt = 'pnpm --filter hydrogen-sanity exec oxfmt --no-error-on-unmatched-pattern'
const oxlint = 'pnpm --filter hydrogen-sanity exec oxlint --disable-nested-config --fix'

export default {
  '*.{js,jsx,ts,tsx}': [oxfmt, oxlint],
  '!(*.{js,jsx,ts,tsx})': oxfmt,
}
