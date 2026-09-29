# BetterMD architecture

BetterMD separates business rules from UI and desktop runtime details.

## Layers

- `src/domain/`: deterministic document, JSON, CSV, search, and shortcut rules. These modules must not import React, Tauri, browser storage, or window APIs.
- `src/application/`: use cases that coordinate domain rules, such as initialising an editable document session. This layer must not import React or Tauri.
- `src/infrastructure/`: adapters for Tauri commands, local storage, and update APIs. This layer translates runtime data into domain types.
- `src/i18n.ts`: interface-language resources and interpolation. UI components consume a translator rather than owning language tables.
- `src/components/`: reusable visual components. File navigation, dialogs, toolbars, welcome screen, and window chrome are isolated here and covered with interaction tests.
- `src/main.tsx`: composition root and screen state. It should coordinate use cases and inject callbacks rather than contain parsing, path, or reusable dialog rules.
- `src-tauri/`: desktop/runtime commands. File-system behavior belongs here and is covered by Rust tests.

## Test policy

Every behavior change must add or update a test in the closest layer:

| Change | Required test |
| --- | --- |
| File type, path, navigation, or link behavior | `src/domain/document.test.ts` |
| JSON operation or highlighting rule | `src/domain/json.test.ts` |
| CSV parsing, table editing, or serialization | `src/domain/csv.test.ts` |
| Search query, result, or focus rule | `src/domain/search.test.ts` |
| Shortcut recording or dispatch rule | `src/domain/shortcuts.test.ts` |
| Document-opening defaults or editor session behavior | `src/application/documentSession.test.ts` |
| Preference persistence or translation | `src/domain/preferences.test.ts` or `src/i18n.test.ts` |
| Tauri runtime boundary | `src/infrastructure/tauri.test.ts` |
| Tauri file-system command | Rust unit/integration test under `src-tauri` |
| User interaction or screen behavior | React component test |

Run all frontend tests with `npm test` and compile the app with `npm run build` before a release.

GitHub Actions runs the same frontend checks on every push and pull request to `main`, alongside the Rust workspace tests on Windows.
