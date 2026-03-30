# Changelog — Rive Playground

## [1.0.0] - 2026-03-30

### CLI & MCP Server
- **Rive Parser rewritten** — switched from `@rive-app/canvas` (high-level) to `@rive-app/canvas-advanced` (low-level WASM). Zero native dependencies (`canvas`, `jsdom`, `xmlhttprequest` removed).
- **Full metadata extraction** — all artboards (not just default), animations with fps/duration, state machines with typed inputs (boolean, number, trigger).
- **Cross-platform** — works on macOS (Intel + Apple Silicon), Linux, Windows without native build issues.
- **5 CLI commands**: `inspect`, `scan`, `validate`, `generate-types`, `watch`.
- **5 MCP tools**: `inspect-rive`, `scan-rive-files`, `validate-rive-config`, `generate-rive-types`, `watch-rive-files`.

### Playground (New)
- **Rive animation viewer** — load `.riv` files via drag-and-drop, file picker, or URL.
- **Real-time ViewModel editing** — string, number, boolean, color, enum, trigger, image properties with live preview.
- **Nested ViewModel support** — drill-down into nested VM instances (Offer1, Offer2, etc.).
- **Image property mapping** — upload local files or paste URLs; images decoded via Rive WASM and applied to animation.
- **State Machine controls** — fire triggers, toggle booleans, adjust numbers in real-time.
- **Animation inspector** — all artboards with dimensions, animations with duration/fps, state machine input types.
- **Playback controls** — play, pause, reset (remount) with floating pill bar.
- **Zoom & Pan** — Ctrl+Scroll to zoom, Alt+Drag to pan, Alt+Double-click to reset.
- **Drag-and-drop on canvas** — drop new `.riv` files directly onto the workspace.
- **Export config** — export current configuration as JSON or Markdown for LiveOps/CSM transfer.
- **Dark theme UI** — ChatGPT-inspired design with Plus Jakarta Sans typography, dot-grid canvas, stagger animations, skeleton loading.
- **Type badges** — color-coded badges for each property type (boolean, number, trigger, string, color, enum, image, viewModel).
