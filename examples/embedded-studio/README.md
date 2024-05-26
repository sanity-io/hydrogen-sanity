# Embedded Sanity Studio

## [Sanity Studio](https://www.sanity.io/studio)

[Sanity Studio](https://www.sanity.io/studio) is an open-source real-time CMS, that you can customize with JavaScript and React.

- Efficient editing, instant UI for complex fields
- Responsive, works on narrow screens
- [Plug-in architecture](https://www.sanity.io/plugins) and [custom components](https://www.sanity.io/docs/component-api)
- [Style with your own branding](https://www.sanity.io/docs/theming)
- [Advanced block editor for structured content](https://www.sanity.io/docs/block-content)
- Use JavaScript to add [field validations](https://www.sanity.io/docs/validation), [organize documents](https://www.sanity.io/docs/overview-structure-builder), and set [initial values](https://www.sanity.io/docs/theming)

## Hydrogen

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Embedded Sanity Studio
- Remix
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

### Notable files and folders

`app/routes/studio.$`

Catch-all route for Sanity Studio, which is rendered client-side.

`app/sanity`

Collocates all Studio-related code, including schema types, structure, etc.

`entry.server.tsx`

Note adjusted content security policy to allow both the embedded Studio as well as Presentation.

`root.tsx`

Added `VisualEditing` component and simplified root `Layout` export.

`server.ts`

Instantiates the Sanity loader and passes it through to the app load context.

`sanity.cli.ts`

Configuration file used by the Sanity CLI, which will load environment variables.

`sanity.config.ts`

Certain Sanity CLI commands, like `sanity documents validate` and `sanity schema extract`, use this configuration file.

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

### Configure environment

- Copy `.env.example` to `.env` or `.env.local`
- Add Shopify environment variables or use `shopify hydrogen env pull` to pull them down from your Oxygen environment
- Add Sanity environment variables, or run `sanity init --env .env` to fill in the project ID and dataset:

```sh
# Project ID
PUBLIC_SANITY_PROJECT_ID=

# (Optional) Dataset name
# Defaults to `production`
# PUBLIC_SANITY_DATASET=

# Sanity token to authenticate requests in "preview" mode
# Only requires 'viewer' role
# https://www.sanity.io/docs/http-auth
SANITY_PREVIEW_TOKEN=
```

## Local development

```sh
npm run dev
```

## Building for production

```sh
npm run build
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
