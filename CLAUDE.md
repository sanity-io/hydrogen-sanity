# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is `hydrogen-sanity`, a monorepo containing a Sanity.io toolkit for Shopify Hydrogen storefronts. The main package is located at `packages/hydrogen-sanity/` and provides React components, hooks, and utilities for integrating Sanity with Hydrogen applications built on React Router 7.

## Build and Development Commands

### Root Commands (using Turbo)

- `pnpm dev` - Start development mode for all packages with TUI
- `pnpm build` - Build all packages
- `pnpm typecheck` - Run TypeScript checks across all packages
- `pnpm lint` - Run linting across all packages
- `pnpm test` - Run Vitest tests (configured for `packages/hydrogen-sanity` workspace)
- `pnpm format` - Format code with Prettier

### Package-Specific Commands

For `packages/hydrogen-sanity/`:

- `pnpm build` - Build the package using `pkg-utils build --strict --clean --check`
- `pnpm watch` - Watch mode using `pkg-utils watch --strict`
- `pnpm typecheck` - TypeScript checking
- `pnpm lint` - ESLint with cache

For example storefront (`examples/storefront/`):

- `pnpm dev` - Start Hydrogen dev server with codegen
- `pnpm build` - Build Shopify Hydrogen app with codegen
- `pnpm typecheck` - TypeScript checking with `--noEmit`
- `pnpm codegen` - Generate Shopify Hydrogen and Sanity TypeGen types

### Running Tests

- Use `pnpm test` at root to run all tests
- Tests are configured to run only in the `packages/hydrogen-sanity` workspace
- Individual test files can be run with `pnpm test <filename>`

## Architecture Overview

### Core Package Structure (`packages/hydrogen-sanity/`)

The package exports multiple entry points with distinct responsibilities:

**Main exports:**

- `hydrogen-sanity` - Core context creation, image utilities, and React provider
- `hydrogen-sanity/preview` - Preview mode hooks and utilities
- `hydrogen-sanity/preview/route` - Pre-built route handler for preview mode
- `hydrogen-sanity/preview/session` - Preview session management
- `hydrogen-sanity/visual-editing` - Visual editing components (`VisualEditing`, `LiveMode`, `Overlays`)
- `hydrogen-sanity/vite` - Vite plugin for Sanity integration

**Key architectural concepts:**

1. **Request Context** (`src/context.ts`): Creates `SanityContext` via `createSanityContext()` that manages:
   - Sanity client configuration and caching
   - Preview mode state and session handling
   - Query loading with Hydrogen cache integration

2. **Visual Editing** (`src/visual-editing/`): Provides real-time preview capabilities:
   - `VisualEditing` - Main component that auto-detects context and provides appropriate experience
   - `LiveMode` - Client-side real-time data sync
   - `Overlays` - Click-to-edit functionality with element highlighting
   - Supports both server-only and hybrid client/server setups

3. **Preview System** (`src/preview/`): Manages preview mode for content editing:
   - Uses dedicated preview session (not shared with app session)
   - Provides authentication flow via secret-based URL parameters
   - Integrates with Sanity's Presentation tool

4. **Provider Pattern** (`src/provider.tsx`): React context provider for seralizing Sanity client configuration across the server-client divide.

## Key Development Patterns

### React Router 7 Usage

This project uses React Router 7, NOT Remix. Always use React Router imports:

- Import from `react-router` (not `@remix-run/react`)
- Import from `@react-router/dev` (not `@remix-run/dev`)
- **Never** use `react-router-dom` imports
- Follow the cursor rules in `examples/storefront/.cursor/rules/hydrogen-react-router.mdc` for proper import patterns

### Testing Setup

- Uses Vitest for testing with workspace configuration
- Test files use `.test.ts/.test.tsx` naming convention
- Testing utilities from `@testing-library/react` for component tests
- GitHub Actions reporter enabled for CI

### Package Management

- Uses pnpm with workspace configuration
- Shared dependencies managed in root `package.json`
- Package versions coordinated through `pnpm.overrides`

## Important Technical Details

### Peer Dependencies

The package requires these peer dependencies:

- `@sanity/client ^7`
- `@shopify/hydrogen ~2025.5.0`
- `react ^18.2.0`
- `react-router 7.6.0`
- `vite ^5.1.0 || ^6.2.1`

### TypeScript Configuration

- Strict TypeScript builds with `pkg-utils build --strict`
- Type definitions exported for all public APIs
- Support for Sanity TypeGen with query type inference

### Environment Requirements

- Node.js >= 20
- Uses pnpm@10.15.0 as package manager
- ESM-only package (`"type": "module"`)

## Visual Editing Implementation Notes

The visual editing system is designed to work seamlessly with both embedded Studio setups and standalone preview environments. Key implementation details:

- Auto-detection of Studio vs standalone contexts
- Context-aware behavior switching between live mode and overlay-only mode
- Integration with Sanity's Content Source Maps (stega) for click-to-edit functionality
- Server revalidation hooks for maintaining data consistency
- Custom CSP configuration required for iframe communication with Studio
