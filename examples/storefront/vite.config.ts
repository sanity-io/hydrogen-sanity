import { reactRouter } from "@react-router/dev/vite";
import { localHttps } from "@shopify/hydrogen/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import tailwindcss from "@tailwindcss/vite";
import { sanity } from "hydrogen-sanity/vite";
import { defineConfig } from "vite";

const oxygenPlugins = oxygen();
const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };

export default defineConfig({
  plugins: [localHttps(httpsOptions), tailwindcss(), ...oxygenPlugins, reactRouter(), sanity()],
  resolve: {
    tsconfigPaths: true,
    // Monorepo only: the linked `hydrogen-sanity` resolves its own `@shopify/hydrogen` dev
    // dependency. Dedupe makes it use this app's copy. An app that installs from npm has one copy.
    dedupe: ["@shopify/hydrogen"],
  },
  build: {
    // Allow a strict Content-Security-Policy
    // without inlining assets as base64:
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
        "react-router > set-cookie-parser",
        "react-router > cookie",
        "react-router",
      ],
    },
  },
  server: {
    allowedHosts: [".tryhydrogen.dev"],
  },
});
