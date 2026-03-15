# Database Diagram — Web UI

The interactive ERD diagram frontend for the [Database Diagram IntelliJ plugin](../database-diagram-jetbrains).

Built with **TypeScript + Vite**, bundled into a single self-contained HTML file by `vite-plugin-singlefile`, and embedded into the plugin JAR at build time. It also runs standalone in any browser for development and testing.

---

## Tech stack

| Library | Purpose |
|---|---|
| Vite | Build tool + dev server |
| vite-plugin-singlefile | Bundle everything into one `index.html` (required for JCEF embedding) |
| panzoom | Pan and zoom the canvas |
| marked | Markdown rendering in sticky notes |
| DOMPurify | Sanitise marked HTML before insertion |

---

## Prerequisites

- Node.js **22+**
- npm **10+**

---

## Quick start

```bash
# Install dependencies
npm install

# Start dev server (hot-reload, no JCEF needed)
npm run dev

# Type-check only (no output)
npm run typecheck

# Production build → dist/index.html
npm run build

# Type-check then build
npm run build:checked
```

The dev server runs at `http://localhost:5173`.
In the browser you can inject test payloads directly from the DevTools console:

```js
window.__devInject({
  type: 'UPDATE_SCHEMA_PAYLOAD',
  payload: {
    tables: [
      {
        id: 'users', schema: 'public', name: 'users',
        fields: [
          { name: 'id',    type: 'serial',      isPrimaryKey: true,  isForeignKey: false, isUnique: true,  isNotNull: true  },
          { name: 'email', type: 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isUnique: true,  isNotNull: true  },
          { name: 'role',  type: 'account_type', isPrimaryKey: false, isForeignKey: false, isUnique: false, isNotNull: true,
            typeCategory: 'ENUM', default: 'individual' }
        ]
      }
    ],
    relationships: [],
    projectSettings: {},
    notes: []
  }
})
```

---

## Project structure

```
database-diagram-web/
├── index.html
├── package.json
├── vite.config.ts          Outputs to dist/ (plain; no plugin path)
├── tsconfig.json
│
└── src/
    ├── main.ts             Entry point — DiagramApplication bootstrap
    │
    ├── models/
    │   └── types.ts        Shared data model (DbTable, DbField, DbNote, …)
    │
    ├── core/
    │   ├── communication/
    │   │   ├── bridge.ts       CEF ↔ JS message bus; dev-mode injection
    │   │   └── protocol.ts     Message type definitions
    │   └── diagram/
    │       ├── diagram-controller.ts     Top-level coordinator
    │       ├── canvas-manager.ts         DOM layer setup
    │       ├── entity-renderer.ts        Renders tables and notes
    │       ├── relationship-coordinator.ts  Schedules SVG line draws
    │       ├── viewport-state-manager.ts    Zoom/pan CSS variable sync
    │       └── table-arranger.ts         Auto-layout for new tables
    │
    ├── components/
    │   ├── relationship/
    │   │   ├── relationship-manager.ts   Owns the full draw cycle
    │   │   ├── relationship-renderer.ts  Normal + overlay SVG rendering
    │   │   ├── note-callout-renderer.ts  Dashed callout arrows from notes
    │   │   ├── layout/                   Column spacing + lane distribution
    │   │   └── path/                     PathGeometer + PathComposer + LabelPlacer
    │   ├── ui/
    │   │   ├── tooltip.ts      Hover tooltip singleton
    │   │   └── color-picker.ts Material palette + custom colour picker
    │   └── widgets/
    │       ├── table-widget.ts     Table card DOM builder
    │       ├── field-widget.ts     Column row DOM builder
    │       ├── note-widget.ts      Sticky note (with Markdown)
    │       ├── toolbar-widget.ts   Zoom controls + legend popup
    │       ├── relationship-widget.ts  SVG group factory
    │       └── anchor-widget.ts    SVG anchor port dots
    │
    ├── interactions/
    │   ├── drag/
    │   │   ├── entity-drag-handler.ts    Table/note drag + resize
    │   │   ├── drug-state-manager.ts     Drag state machine
    │   │   ├── interaction-detector.ts   Mouse event routing
    │   │   ├── table-notifier.ts         Fires UPDATE_TABLE_POS
    │   │   └── note-notifier.ts          Fires UPDATE_NOTE_POS
    │   └── viewport-controller.ts        Wraps panzoom, cursor management
    │
    └── styles/
        ├── main.css            @import aggregator
        ├── theme.css           CSS variables (light + dark)
        ├── viewport.css        Canvas, cursors, semantic-zoom
        ├── ui/
        │   ├── icons.css       Key icon colours + stroke rules
        │   ├── toolbar.css     Toolbar + legend popup
        │   ├── tooltip.css     Hover tooltip
        │   └── color-picker.css  Colour picker popup
        └── widgets/
            ├── table.css       Table card
            ├── field.css       Column row + badges
            ├── note.css        Sticky note + Markdown elements
            └── relationship.css  SVG lines, labels, anchors, callouts
```

---

## Message protocol

The web app communicates with the Kotlin plugin via `window.postMessage` (IDE → web) and the CEF `cefQuery` function (web → IDE). All messages are plain JSON with a `type` discriminator.

### IDE → Web

| Type | Payload | Description |
|---|---|---|
| `UPDATE_SCHEMA_PAYLOAD` | `SchemaPayload` + optional `GlobalSettings` | Full schema reload |
| `UPDATE_THEME` | `{ theme: "dark" \| "light" }` | Switch colour theme |
| `UPDATE_GLOBAL_SETTINGS` | `lineStyle`, `showGrid`, `gridSize`, note settings | Apply settings |

### Web → IDE

| Type | Payload | Description |
|---|---|---|
| `READY` | — | Page loaded, JS listener active |
| `UPDATE_TABLE_POS` | `tableName`, `x`, `y`, `width` | Table moved/resized |
| `UPDATE_NOTE_POS` | `name`, `x`, `y`, `width`, `height` | Note moved/resized |
| `UPDATE_TABLE_COLOR` | `tableName`, `color` | Table colour changed |
| `UPDATE_NOTE_COLOR` | `noteId`, `color` | Note colour changed |
| `LOG` | `level`, `message` | Console log forwarded to IDE |

---

## Relationship line styles

The `lineStyle` setting controls how connection paths are drawn between columns:

| Style | Description |
|---|---|
| `Curve` | Smooth cubic Bézier (default) |
| `Rectilinear` | Right-angle turns, sharp corners |
| `RoundRectilinear` | Right-angle turns, rounded corners |
| `Oblique` | Diagonal segments, sharp corners |
| `RoundOblique` | Diagonal segments, rounded corners |

---

## Field type badges

| Badge | Colour | Meaning |
|----|---|---|
| `UQ` | Purple | Unique constraint |
| `NN` | Grey | Not Null constraint |
| `ENUM` | Green | PostgreSQL / inline ENUM type |
| `RECORD`, `DOMAIN`, … | Orange | User-defined / custom type (category set by Kotlin backend) |

The web layer is **database-agnostic** — it renders whatever `typeCategory` string the Kotlin backend sets. The backend's `ErdDataBuilder` maintains the list of standard built-in types and classifies everything else.

---

## Semantic zoom

Below a zoom threshold of **0.5×**, the canvas switches to overlay mode:

- Each table collapses to its header height with `width: fit-content`
- The overlay shows the **table name** + **column count**
- Relationship lines remain visible (with scale-compensated stroke width)
- Crossing back above the threshold triggers a fresh column-level redraw

---

## Integration with the plugin build

The plugin's `build.gradle.kts` runs `npm run build` in this project directory and copies `dist/index.html` into `src/main/resources/web/` using a Gradle `Sync` task:

```
./gradlew copyWebDist   # manual copy only
./gradlew buildPlugin   # full plugin build (includes npm build)
```

The output path (`dist/`) is intentionally plain — no hard-coded reference to the plugin project. The plugin Gradle build controls where the file goes.

---

## Gitignore

```gitignore
dist/
node_modules/
.gradle/
```