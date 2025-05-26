# Migrating from v4 to v5

## Prerequisites

Before upgrading to `hydrogen-sanity@^5`, you must first [migrate your Hydrogen project to use React Router 7](https://hydrogen.shopify.dev/update/may-2025).

## Add the Vite plugin

Add the `hydrogen-sanity/vite` plugin to your Vite configuration:

```ts
import {defineConfig} from 'vite'
import {hydrogen} from '@shopify/hydrogen/vite'
import {oxygen} from '@shopify/mini-oxygen/vite'
import {reactRouter} from '@react-router/dev/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import {sanity} from 'hydrogen-sanity/vite'

export default defineConfig({
  plugins: [hydrogen(), sanity(), oxygen(), reactRouter(), tsconfigPaths()],
  // ... rest of your config
})
```
