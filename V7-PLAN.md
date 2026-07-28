# v7 plan

Working notes for the v7 major and the release-line mechanics. Delete or fold into the migration guide once v7 ships.

## Why v7 exists

The immediate driver is the stega props Cody asked every framework package to expose
([Slack thread](https://sanity-io.slack.com/archives/C047H2S31T6/p1784624268946169), PR #191):
`keepStegaOnCopy` and `onSuspiciousStega` on `<VisualEditing />`.

Those props cannot ship without a major:

| Fact                                                                                   | Consequence                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| The props exist only in `@sanity/visual-editing` **5.5.0+**                            | We must move off v4                                     |
| `@sanity/visual-editing` **5.0.0** made `react`/`react-dom` non-optional peers `^19.2` | React 18 is no longer installable                       |
| Its dist imports `react/compiler-runtime`, absent in React 18                          | React 18 fails at build, not gracefully                 |
| Hydrogen 2026.x still accepts `^18.3.1`                                                | Dropping React 18 is **our** constraint, not upstream's |
| Hydrogen `2025.5.0` peers `react ^18.2.0`; `2025.7.0` pins `18.3.1`                    | Both become unsatisfiable and leave the supported range |

Precedent: `next-sanity` did exactly this as **v12.0.0** — React 19.2 floor plus a short
migration doc, no compat shim, no dual-React window. `@sanity/astro` and `@sanity/sveltekit`
shipped minors because they are not React.

## Release-line mechanics

`packages/hydrogen-sanity/release.config.mjs` already wires a `next` prerelease channel, so
nothing new is needed in config beyond the `v6` maintenance entry (added).

Sequencing matters because **`main` is the v6 line until v7 is promoted**:

1. ~~**Land PR #192 on `main`**~~ — done, `main` is at `4cb1cdf`.
2. ~~**Reset `next` onto `main`.**~~ — done, `origin/next` and `origin/main` are the same commit.
3. ~~**Reconcile PR #191 with the new `next`.**~~ — done as a merge, not a rebase. #191 was cut
   before `main`'s Sanity 6 alignment, so its `chore(deps): raise dependency floors` commit
   (2026-07-26) would have reverted `sanity`/`@sanity/vision` 6.6.0 → 5.31.1,
   `sanity-plugin-media` 6 → 4, `groq` 6 → 4, `lint-staged` 17 → 16, `commitlint` 21 → 20 and
   pnpm 11 → 10, plus dropped `"prepare": "husky"` and re-added the `typesVersions` block and
   TSDoc `@param` tags that `main` had just removed. Note root `package.json` **auto-merges
   without conflict**, so those downgrades land silently unless the merge tree is corrected
   deliberately. `next` wins on every workspace-wide dependency; #191 keeps its package-scoped
   bumps, which are current.
4. Ship `7.0.0-next.1` on the `next` dist-tag via the manual `workflow_dispatch`
   (`release=true`). Releases never fire on push. Cody can install `hydrogen-sanity@next`
   immediately while `latest` stays React 18-compatible.
5. **At promotion**, merge `next` into `main` and _then_ cut the `v6` branch from the last
   6.x commit. Cutting `v6` earlier is premature — `main` is serving that line.

Do not use `.github/workflows/manual-publish.yml` for any of this; it bypasses
semantic-release and publishes straight to `latest` with no dist-tag control.

## Landed so far (on `cursor/visual-editing-stega-props-5f3b`)

- `build:` oxlint + oxfmt in `packages/hydrogen-sanity` only; `fix:` the pre-commit hook and
  the package's lint-staged config (details below).

- `fix!:` peer ranges corrected — `react`/`react-dom` `^19.2.3`, `@sanity/client` `^7.24.0`,
  Hydrogen `~2025.7.3 || ~2025.10.0 || ~2026.1.0 || ~2026.4.0`, `react-router` left at v6's
  `^7.6.0`, and `vite` marked an optional peer. The branch previously kept
  `react: ^18.2.0 || ^19.0.0` and `@sanity/client: ^7`, both of which had become false, and
  declared no `react-dom` peer at all despite it being a hard upstream requirement.
  `^19.2.3` rather than `^19.2` because Hydrogen rejects 19.2.0–19.2.2.

  **The Hydrogen range is scoped to React 19.2 support and nothing else.** Hydrogen added
  `^19.2.3` to its `react` peer in **2025.7.3**, so only `~2025.5.0` and `2025.7.0`–`2025.7.2`
  are dropped from v6's range; `~2025.10.0` is added, which v6 had omitted. An earlier pass
  narrowed this to `~2026.4.4` to put CVE-2026-42211 out of reach, which was wrong twice over: a
  peer range expresses compatibility rather than security policy, and `~2026.4.4` would have gone
  unsatisfiable the moment Hydrogen 2026.5 shipped. `react-router` has to stay `^7.6.0` for the
  same reason — 2025.7.3, 2025.10.x and 2026.1.x pin react-router `7.12.0` exactly, so a
  `^7.16.0` peer makes those Hydrogen releases unsatisfiable and the range self-contradictory.

- `refactor:` dropped the `use-effect-event` ponyfill for React 19.2's native
  `useEffectEvent` (6 call sites). Upstream removed the same dependency in 5.0.0.
- `docs:` this plan, `MIGRATE-v6-to-v7.md`, a `hydrogen-sanity` version callout in the README
  (Cody asked for per-package version callouts in the thread), and the `v6` maintenance
  channel in `release.config.mjs`.

### oxlint + oxfmt migration — done (workspace-scoped)

Scoped per workspace: **only `packages/hydrogen-sanity` moved to oxlint + oxfmt.** The example
apps (`examples/storefront`, `examples/studio`) and the private `@repo/sanity-config` keep
their own ESLint setups, and root Prettier still serves them. `packages/hydrogen-sanity` is in
`.prettierignore` so the two formatters do not fight over the same files.

This scoping sidestepped two problems the whole-repo approach had: no reformat churn in the
example app, and no need to decide between Shopify style and Sanity style for it. It also
removed the "must land after #192" ordering constraint, since nothing outside the package is
touched.

Landed at `oxlint@^1.75.0` / `oxfmt@^0.60.0`, both JSON configs (not `oxlint.config.ts`, which
needs Node ≥22.18 and would raise our `>=20.19` contributor floor). Formatting diff was
**zero files** — root `.prettierrc` was already Sanity house style.

The port is faithful rather than default-adopting. `react/rules-of-hooks` and
`react/exhaustive-deps` are off by default in oxlint and were enabled explicitly. Four rules
carried over from `eslint-config-sanity@7.1.4` at their original `warn` severity
(`typescript/no-explicit-any`, `typescript/explicit-module-boundary-types`, `react/no-danger`,
`no-empty-function`) so the 10 existing `eslint-disable` directives in `src/` stay meaningful
instead of being reported as unused. Note oxlint's `react_perf/` and `jsx_a11y/` rule IDs use
underscores while the `plugins` array uses hyphens — get it wrong and the rules are silently
inert. `sortPackageJson` is off in oxfmt because it alphabetizes `exports`, and our 7-entry map
plus mirrored `publishConfig.exports` is order-significant.

Two latent bugs found and fixed along the way: `.husky/pre-commit` was not executable, so git
silently skipped it and lint-staged never ran locally — which masked
`packages/hydrogen-sanity/lint-staged.config.js` importing `../lint-staged.base.js`, a path
that resolves to `packages/lint-staged.base.js` and does not exist, so the config threw on
load. Both fixed and verified by real commits running the hook.

**Deliberately deferred:** `typeAware` / `typeCheck` linting. It needs `customConditions`
tsconfig surgery and we already have a working `tsc` task. Consequence worth knowing: the
`no-floating-promises` class of rule now has no equivalent coverage in the package, and `tsc`
does not cover it.

**Still open from the tooling pass:**

- `turbo.json`'s `lint` task still declares `outputs: [".eslintcache"]` — dead config now
  (harmless, the task is `cache: false`).
- No `.vscode/settings.json` / `extensions.json`, so a contributor's Prettier extension will
  silently disagree with oxfmt inside the package.
- `@typescript-eslint/naming-convention` has no oxlint equivalent. It was not enforced in the
  package (only in the storefront, which keeps ESLint), so nothing was lost here.
- `@rollup/plugin-node-resolve` is an unused devDependency — it was only referenced by the
  commented-out rollup block in `package.config.ts`, which is gone.

Closed since: the 2 `no-floating-promises` errors in `examples/storefront` were fixed by #192,
so root `pnpm lint` is green (4/4).

## Known dev-environment friction (not published-peer problems)

- `@shopify/hydrogen@2026.4.2` pulls `use-resize-observer@9.1.0`, which peers
  `react "16.8.0 - 18"` — an unmet-peer warning under React 19. Hydrogen's stale transitive
  dep; worth reporting upstream to Shopify.
- `@shopify/hydrogen@2026.4.4` peers `react-router: ~7.16.0` while we develop against 7.18.x to
  close CVE-2026-55685 — two unmet-peer warnings by design. Our own peer is the permissive
  `^7.6.0`, so consumers pick their own point on that range.
- Four more unmet peers come from `@napi-rs/wasm-runtime` wanting `@emnapi/*` `^2.0.0-alpha.3`,
  pulled transitively by the oxlint platform bindings. Upstream noise, nothing to act on.
- `oxlint` is held at 1.75.0. Resolving 1.76.0 the day it published made pnpm write 20
  `minimumReleaseAgeExclude` entries into `pnpm-workspace.yaml`, permanently bypassing the
  supply-chain cooldown for those builds. Raise the floor once a release clears the window.

Closed since: `@shopify/hydrogen`'s Vite peer (2026.4.4 widens to `^8.0.0`) and the
non-executable `.husky/pre-commit` are both fixed on `main`.
