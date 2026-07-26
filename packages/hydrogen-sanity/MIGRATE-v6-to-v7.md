# Migrating from v6 to v7

## Upgrade React to 19.2.3

```sh
npm install react@^19.2.3 react-dom@^19.2.3
npm install --save-dev @types/react@^19.2 @types/react-dom@^19.2
```

Follow the [React 19 upgrade guide][react-19-upgrade] for codemods and behavioural changes in your own components.

Hydrogen has peered `^18.3.1 || ~19.0.3 || ~19.1.4 || ^19.2.3` since `2025.7.3`, so on any supported
Hydrogen release you can upgrade React without changing Hydrogen.

## New: stega clipboard and misuse reporting

Two new optional props are available on `<VisualEditing />` (and on `<Overlays />`), from `@sanity/visual-editing` 5.5:

```tsx
<VisualEditing
  // Stega is stripped from the clipboard on copy by default.
  // Set this to opt out.
  keepStegaOnCopy
  // Opt in to detection by providing the callback.
  onSuspiciousStega={(reports) => {
    for (const report of reports) {
      console.warn(`Stega found in ${report.kind}`, report)
    }
  }}
/>
```

`onSuspiciousStega` reports stega payloads found in places where they always cause bugs — `class` and `href` attributes, `<head>`, scripts, styles, form values, and URLs. Detection is off unless you pass the callback, because scanning is expensive.

The `SuspiciousStegaReport` type is exported from `hydrogen-sanity/visual-editing`.

[visual-editing]: https://github.com/sanity-io/visual-editing
[react-19-upgrade]: https://react.dev/blog/2024/04/25/react-19-upgrade-guide
