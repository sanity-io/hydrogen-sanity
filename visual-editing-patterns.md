# Visual Editing Implementation Patterns

## Overview

This document canonizes the findings from researching the `@sanity/visual-editing` package implementation patterns to ensure consistency across Sanity implementations.

## Key Implementation Patterns

### 1. Client-Side Loader Detection

The visual-editing package uses multiple mechanisms to differentiate between client-side loader setups vs non-loader setups:

**Detection Mechanisms:**

- **Environment Detection**: `isMaybePreviewIframe()` and `isMaybePreviewWindow()`
- **Live Preview Flag**: `livePreviewEnabled` boolean in `HistoryRefresh` events
- **Optimistic Actor State**: `isEmptyActor(actor)` check
- **Features Query**: `visual-editing/features` to check optimistic update support

**Key Detection Logic:**

```typescript
function getDocumentsAndSnapshot<T extends Record<string, any>>(id: string, actor: MutatorActor) {
  const inFrame = isMaybePreviewIframe()
  const inPopUp = isMaybePreviewWindow()

  if (isEmptyActor(actor) || (!inFrame && !inPopUp)) {
    throw new Error('The `useDocuments` hook cannot be used in this context')
  }
}
```

### 2. Presentation Comlink Event Handling

**Architecture:**

- **Comlink Setup**: `useComlink` hook creates communication node to 'presentation'
- **Event Processing**: Handles `presentation/refresh`, `presentation/perspective`, `presentation/navigate`
- **Status Handling**: Listens for `presentation/status` when connection fails

**Event Types:**

```typescript
export type VisualEditingControllerMsg =
  | {type: 'presentation/focus'; data: {id: string; path: string}}
  | {type: 'presentation/blur'; data: undefined}
  | {type: 'presentation/navigate'; data: HistoryUpdate}
  | {type: 'presentation/refresh'; data: HistoryRefresh}
  | {type: 'presentation/perspective'; data: {perspective: ClientPerspective}}
```

### 3. Refresh Logic Patterns

**Framework-Specific Implementation:**

**Next.js Pages Router:**

```typescript
switch (payload.source) {
  case 'manual':
    return routerRefresh() // Always refresh
  case 'mutation':
    return payload.livePreviewEnabled ? skipRefresh() : mutationRefresh()
  default:
    throw new Error('Unknown refresh source')
}
```

**Remix (matches our React Router pattern):**

```typescript
refresh: (payload) => {
  function refreshDefault() {
    if (payload.source === 'mutation' && payload.livePreviewEnabled) {
      return false // Skip refresh, client loaders handle it
    }
    return new Promise<void>((resolve) => {
      revalidator.revalidate()
      setRevalidatorPromise(() => resolve)
    })
  }
  return refresh ? refresh(payload, refreshDefault) : refreshDefault()
}
```

**Core Refresh Component Logic:**

```typescript
comlink.on('presentation/refresh', (data) => {
  if (data.source === 'manual') {
    // Always handle manual refreshes
    const promise = refresh(data)
    if (promise === false) return
    comlink.post('visual-editing/refreshing', data)
  } else if (data.source === 'mutation') {
    // Handle mutation refreshes with eventual consistency
    const promise = refresh(data)
    if (promise === false) return
    comlink.post('visual-editing/refreshing', data)
    // Additional refresh after 1000ms for Content Lake consistency
  }
})
```

### 4. Component Architecture

**Separation of Concerns:**

- **Overlays Component**: Handles visual overlays, comlink events, refresh logic
- **LiveMode Component**: Handles client-side loader synchronization only
- **VisualEditing Component**: Composes overlays and live mode based on configuration

**Key Insight:**
Presentation comlink events should be handled by the **Overlays component** (where `enableVisualEditing` is called), not the main VisualEditing component.

## Hydrogen-Sanity Implementation Status

### ✅ Current Implementation (Updated)

**Architecture:**

- **VisualEditing Component**: Composition wrapper with smart defaults and context detection
- **Overlays Component**: Handles visual overlays, perspective changes, and Studio communication
- **LiveMode Component**: Handles client-side loader synchronization only

**Smart Defaults & Context Detection:**

- Uses `isMaybePresentation()` to detect Studio presentation context for message handling
- Live mode is **opt-in only** (`liveMode ?? false`) to prevent incorrect loader assumptions
- Supports explicit `liveMode={true}` when client loaders (`useQuery`) are active
- Defaults to overlays-only (server revalidation) for all contexts unless explicitly overridden

**Perspective Change Handling:**

- **Overlays Component** listens for `presentation/perspective` events via `window.addEventListener`
- Uses React Router's `useSubmit()` to submit perspective changes to action endpoint
- Defaults to `/api/preview` action if none provided
- Always triggers server revalidation after perspective changes (`source: 'manual'`)
- Passes `action` prop from VisualEditing down to Overlays

**Refresh Logic (in Overlays):**

```typescript
refresh: (payload) => {
  // For server-only setups, always handle refresh events
  // For live mode setups, let the client loaders handle mutations
  if (!liveMode || payload.source === 'manual') {
    return refreshFn(payload)
  }
  return false
}
```

**Message Handling Pattern:**

- **Studio Context Detection**: Uses `inStudioContext` state from `isMaybePresentation()`
- **Message Filtering**: Only handles `presentation/perspective` events in Overlays
- **Lets enableVisualEditing handle**: `presentation/refresh` events automatically
- **Integration**: Uses `useRefresh()` hook for consistent revalidation patterns

### Key Features & Benefits

**Progressive Enhancement:**

- Individual component usage: `<Overlays />` + `<LiveMode />` for fine control
- Convenience wrapper: `<VisualEditing />` with safe defaults
- Opt-in live mode prevents Studio/Presentation loader assumptions

**Studio Integration:**

- Proper perspective change handling with server revalidation
- Message-based communication using native `window.addEventListener`
- Integration with React Router for seamless form submissions
- Customizable action endpoint for perspective updates

**Optimized Refresh Behavior:**

- Server-only setups: Always revalidate for mutations and perspective changes
- Live mode setups: Client loaders handle mutations, server handles perspective/manual refreshes
- Consistent with official Sanity visual-editing patterns

## Implementation Guidelines

1. **Server-Only (Default - Recommended)**:

   ```tsx
   <VisualEditing /> // Defaults to overlays-only, server revalidation
   ```

   - Always triggers server revalidation for all events
   - Suitable for `loadQuery`-only patterns
   - Optimal for server-rendered content
   - **Safe default** - prevents Studio from assuming active client loaders

2. **Live Mode Setups** (`liveMode={true}` - Explicit Opt-in):
   ```tsx
   <VisualEditing liveMode={true} /> // Only when useQuery hooks are active
   ```

   - Client loaders handle mutations automatically
   - Server revalidation only for perspective changes and manual refreshes
   - **Required** for `useQuery` + `loadQuery` patterns
   - **Only use when** you have active client-side data loaders

### ⚠️ Important: Live Mode Opt-In Policy

Live mode must be **explicitly enabled** with `liveMode={true}`. Auto-detection based on Studio context is avoided because:

- **Studio assumption risk**: Auto-enabling could make Presentation tool think client loaders are active
- **Refresh behavior mismatch**: Mutations might be skipped expecting client updates that won't happen
- **Server-only safety**: Default behavior ensures server revalidation works correctly

3. **Individual Composition**:

   ```tsx
   <Overlays action="/custom/preview" />
   <LiveMode onConnect={onConnect} />
   ```

4. **Event Handling Architecture**:
   - Presentation events (perspective changes) → Overlays component
   - Client loader events (mutations) → LiveMode component
   - Composition and context detection → VisualEditing component
