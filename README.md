# Rive Playground

Inspect, validate, and control Rive `.riv` animation files — from the terminal, AI assistants, or a visual playground.

Provides a **CLI tool**, **MCP server** (for AI assistants like Claude), and a **Playground** (visual editor with real-time ViewModel controls).

## Why

Rive `.rev` project files are editor-only and can't be parsed externally. This tool uses the official `@rive-app/canvas` WASM runtime headlessly (via `node-canvas` + `jsdom`) to extract full metadata from compiled `.riv` files: artboards, state machines, inputs, animations.

## Installation

```bash
cd /path/to/rive-mcp-analyzer
npm install
npm run build
```

### Global CLI install (optional)

```bash
npm link
rive-analyzer --help
```

## CLI Usage

```bash
node dist/cli.js <command> [options]
```

### inspect

Parse a `.riv` file and list all artboards, state machines, inputs, and animations.

```bash
node dist/cli.js inspect ./animation.riv
node dist/cli.js inspect ./animation.riv --json
```

**Output example:**

```
File: /path/to/animation.riv
Size: 57.4 KB
Rive version: 7.0
Parse method: wasm

Artboards (1):
  ★ Main (1920×1080)
    Animations (3):
      - idle (0.00s @ 60fps)
    State Machines (1):
      - Main SM
          [boolean] isVisible
          [trigger] RESET
          [number] speed
```

### scan

Recursively find and inspect all `.riv` files in a directory.

```bash
node dist/cli.js scan ./public/
node dist/cli.js scan ./public/ --json
```

### validate

Compare a `.riv` file's metadata against a JS/TS constants file that references artboard/SM names.

```bash
node dist/cli.js validate ./animation.riv ./src/constants/rive.js
```

**Output example:**

```
Artboards:
  ✓ "Main" — match
  ✗ "MainBoard" — missing_in_riv

State Machines:
  ✓ "Main SM" — match
  ~ "Old SM" — extra_in_config

✗ INVALID
1 value(s) referenced in config but not found in .riv file.
```

Exits with code 1 if validation fails — useful in CI pipelines.

### generate-types

Auto-generate TypeScript constants from `.riv` metadata.

```bash
node dist/cli.js generate-types ./animation.riv
node dist/cli.js generate-types ./animation.riv --output ./src/types/rive-generated.ts
```

**Generated output:**

```typescript
export const ANIMATION_ARTBOARDS = {
  MAIN: "Main",
} as const;

export const ANIMATION_STATE_MACHINES = {
  MAIN_SM: {
    name: "Main SM",
    inputs: {
      IS_VISIBLE: { name: "isVisible", type: "boolean" as const },
      RESET: { name: "RESET", type: "trigger" as const },
    },
  },
} as const;
```

### watch

Watch `.riv` files for changes and output a diff when they change.

```bash
node dist/cli.js watch "./public/**/*.riv"
```

Press `Ctrl+C` to stop.

## MCP Server Setup

The MCP server exposes all 5 tools to AI assistants via stdio transport.

### Start the server

```bash
node dist/mcp.js
```

### Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rive-analyzer": {
      "command": "node",
      "args": ["/absolute/path/to/rive-mcp-analyzer/dist/mcp.js"]
    }
  }
}
```

### Add to OpenCode

Edit your OpenCode MCP config or `AGENTS.md` to register the server.

### Available MCP Tools

| Tool                   | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `inspect-rive`         | Parse a `.riv` file, return artboards/SMs/animations |
| `scan-rive-files`      | Scan directory, return all `.riv` file metadata      |
| `validate-rive-config` | Check if JS/TS config matches `.riv` metadata        |
| `generate-rive-types`  | Generate TypeScript type constants                   |
| `watch-rive-files`     | Watch for changes for N seconds, return diff         |

### Example AI conversation

```
You: Use inspect-rive on ./public/lobby.riv and tell me what state machine inputs are available

AI: [calls inspect-rive tool]
    The lobby.riv file has 1 artboard "Main" (1920×1080) with state machine "Main SM"
    containing 3 inputs:
    - isVisible (boolean, default: false)
    - speed (number, default: 1)
    - RESET (trigger)
```

## How It Works

1. **Binary header**: Reads the `.riv` file to verify it's a valid Rive file and extract version info
2. **WASM parsing**: Uses `@rive-app/canvas` WASM runtime with `node-canvas` + `jsdom` as a headless Canvas/DOM environment
3. **Metadata extraction**: Calls `Rive.animationNames`, `Rive.stateMachineNames`, `Rive.stateMachineInputs()`, `Rive.bounds`
4. **Graceful degradation**: If WASM fails (bad file, corrupt data), falls back to binary header info only

## Limitations

- **`.rev` files**: Rive Editor project files are NOT supported (editor-internal format, no public spec)
- **Multiple artboards**: The Rive high-level API exposes the default artboard only; non-default artboards require the low-level WASM API (planned for future version)
- **Animation duration**: The high-level API doesn't expose animation duration directly (shown as 0.00s)
- **"No WebGL support"**: This message is expected — the tool uses Canvas 2D mode which is sufficient for metadata extraction

## Playground

```bash
cd playground
npm install
npm run dev
```

Open `http://localhost:5173` — drop a `.riv` file to start.

### ViewModel Editing

| Type | Control | Badge |
|------|---------|-------|
| `boolean` | Toggle switch | 🔵 Blue |
| `number` | Slider + input | 🟣 Purple |
| `string` | Text input | 🟢 Green |
| `trigger` | Fire button | 🟡 Amber |
| `color` | Color picker | 🩷 Pink |
| `enum` | Dropdown | 🩵 Cyan |
| `image` | URL + upload | 🟠 Orange |
| `viewModel` | Nested panel | 🟣 Purple |

### Canvas Controls

| Action | Input |
|--------|-------|
| Zoom | `Ctrl/Cmd + Scroll` |
| Pan | `Alt + Drag` |
| Reset view | `Alt + Double-click` |
| Rive interaction | Click / Hover (passthrough) |

### Export

Export configuration as JSON or Markdown for LiveOps/CSM transfer.

## Architecture

```
.riv file
  ├── CLI/MCP → @rive-app/canvas-advanced (Node.js WASM, zero native deps)
  │               └→ rive.load() → file.artboardByIndex() → metadata
  └── Playground → @rive-app/react-canvas (Browser WASM)
                    ├→ useRive() → Canvas rendering + interaction
                    ├→ rive.viewModelInstance → live property editing
                    └→ @rive-app/canvas-advanced → metadata extraction
```

## Requirements

- Node.js 18+
- npm 8+
