import {defineCliConfig} from 'sanity/cli';

/**
 * This app is not a Studio — the config exists so `sanity typegen generate` can find its settings.
 * `@sanity/cli` v6 deprecated the standalone `sanity-typegen.json` in favour of this `typegen` key.
 *
 * The schema is produced by `@repo/sanity-config`'s `extract` task, which is why it is read from
 * outside this workspace rather than generated here.
 */
export default defineCliConfig({
  typegen: {
    schema: '../../packages/sanity-config/schema.json',
    path: './**/*.{ts,tsx,js,jsx}',
    generates: './sanity.generated.d.ts',
  },
});
