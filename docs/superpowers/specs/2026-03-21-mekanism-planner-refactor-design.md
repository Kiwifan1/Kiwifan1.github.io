# Mekanism Planner Refactor Design

**Date:** 2026-03-21
**Scope:** Full refactor of the Mekanism Fission Planner page — routing, CSS tokens, component decomposition, and visualizer split.

---

## 1. Routing & Layout: Lazy-loaded tool modules with a separate layout

### Current State
All routes are eagerly imported in `app.routes.ts`. Every page shares one layout (navbar + `<router-outlet>`).

### Design
- Split routes into two groups: **portfolio** (`/`, `/about`, `/links`) and **tools** (`/tools/**`).
- **Note:** A `Resume` component exists at `src/app/resume/` but is not currently registered in `app.routes.ts` or linked in the navbar. During this refactor, add `/resume` to the portfolio routes so it becomes accessible.
- Tools routes become a lazy-loaded child module:
  ```ts
  { path: 'tools', loadChildren: () => import('./tools/tools.routes') }
  ```
- Create a `ToolsLayout` wrapper component:
  - Its own navigation (breadcrumbs, back links, wider content area).
  - Wraps a child `<router-outlet>` for tool sub-routes.
  - Uses the `--tool-*` CSS token scope (see section 2).
- Portfolio routes keep the current `Navbar` and narrow `960px` layout.
- The Mekanism calculator code (models, optimization, visualizer) only loads when someone visits a tools page.

### Files Changed
| File | Action |
|---|---|
| `src/app/app.routes.ts` | Remove eager tool imports, add lazy `loadChildren`, register `/resume` route |
| `src/app/app.config.ts` | No changes required — lazy-loading is configured in routes, not the config provider |
| `src/app/tools/tools.routes.ts` | **New** — child routes for tools section |
| `src/app/tools/tools-layout/tools-layout.ts` | **New** — layout wrapper component |
| `src/app/tools/tools-layout/tools-layout.html` | **New** — breadcrumbs + `<router-outlet>` |
| `src/app/tools/tools-layout/tools-layout.css` | **New** — wider layout, `--tool-*` token scope |

---

## 2. CSS Token System: Tool-specific tokens derived from the base theme

### Current State
`styles.css` defines global tokens (`--surface`, `--surface-border`, `--kiwi-green`). The planner and visualizer CSS reference undefined custom properties (`--kiwi-surface`, `--kiwi-border`, `--kiwi-accent`) that always fall through to hardcoded fallback values. This makes the tools section visually disconnected from the rest of the site.

### Design
- Define a `--tool-*` token layer scoped to the `ToolsLayout` component:
  ```css
  :host {
    --tool-surface: var(--surface);
    --tool-border: var(--surface-border);
    --tool-accent: var(--kiwi-green);
    --tool-accent-strong: var(--kiwi-lime);
    --tool-text: var(--kiwi-fore);
    --tool-muted: var(--text-muted);
    --tool-input-bg: var(--surface-strong);
  }
  ```
- Replace all orphaned `var(--kiwi-surface, #111)` patterns in planner, visualizer, and mekanism CSS with `var(--tool-*)` tokens.
- No changes to `styles.css` global tokens.
- The tools section inherits the site look by default but can be independently re-themed by overriding just the `--tool-*` layer.

### Files Changed
| File | Action |
|---|---|
| `src/app/tools/tools-layout/tools-layout.css` | Define `--tool-*` tokens |
| `src/app/tools/minecraft/mekanism/mekanism.css` | Migrate to `--tool-*` |
| `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.css` | Migrate to `--tool-*` |
| `src/app/tools/minecraft/mekanism/structure-visualizer/structure-visualizer.css` | Migrate to `--tool-*` (split across new visualizer components) |

---

## 3. Component Decomposition: Fission Planner

### Current State
`fission-planner.ts` is ~370 lines containing:
- Reactive form logic and plan recomputation
- `selectTurbineDimensions` / `selectBoilerDimensions` brute-force search functions
- Formatting helpers (`asNumber`, `asDecimal`, `describeCount`)

`fission-planner.html` is ~256 lines with near-identical construction summary blocks repeated 4 times (turbine per-unit, turbine total, boiler per-unit, boiler total).

### Design

#### 3a. Extract dimension search logic
Move `selectTurbineDimensions`, `selectBoilerDimensions`, and `compareScores` into a new file `utils/dimension-search.ts`. These are pure functions with no Angular dependency.

#### 3b. Extract formatting helpers
Move `asNumber`, `asDecimal`, `describeCount` into `utils/format.ts`. These are needed by the planner and by child components.

#### 3c. Extract `ConstructionSummary` component
A reusable component that takes shell breakdown + internals data as `@Input()` and renders the per-unit / total material lists.

**Inputs:**
- `title: string` — section heading (e.g. "Construction (per turbine)")
- `shell: ShellBreakdown` — casing/glass counts
- `internals: Record<string, number | object>` — component-specific internals
- `geometry?: Record<string, number>` — optional geometry note

Used 4 times in the template, eliminating ~120 lines of repeated markup.

#### 3d. Extract `PerformanceCard` component
A small component for the performance stats section.

**Inputs:**
- `burnRate: number`
- `safeBurnRate: number`
- `steamDemand: number`
- `waterDemand: number`
- `powerPerTick: number`

#### 3e. Slim down `FissionPlanner`
After extraction, the fission planner becomes a thin orchestrator:
- Form handling and validation
- Calling `selectTurbineDimensions` / `selectBoilerDimensions` from utils
- Calling `computeWaterCoolingRequirements` / `computeSodiumCoolingRequirements`
- Composing child components with data binding

**Target:** ~150-180 lines TS, ~80-100 lines HTML.

### Files Changed
| File | Action |
|---|---|
| `src/app/utils/dimension-search.ts` | **New** — search functions extracted from fission-planner.ts |
| `src/app/utils/format.ts` | **New** — formatting helpers |
| `src/app/utils/index.ts` | Update re-exports |
| `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.ts` | **New** |
| `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.html` | **New** |
| `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.css` | **New** |
| `src/app/tools/minecraft/mekanism/performance-card/performance-card.ts` | **New** |
| `src/app/tools/minecraft/mekanism/performance-card/performance-card.html` | **New** |
| `src/app/tools/minecraft/mekanism/performance-card/performance-card.css` | **New** |
| `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.ts` | Slim down, import from utils |
| `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.html` | Replace repeated blocks with child components |

---

## 4. Visualizer Split: Three components + extracted grid logic

### Current State
`structure-visualizer.ts` is ~660 lines containing:
- Turbine layer building (rotor layers, coil placement, vent crown)
- Boiler layer building (water cavity, superheaters, pressure disperser deck, steam cavity)
- Shared grid helpers (createBaseGrid, setCell, makeCell, etc.)
- Material summarization
- Tab switching and layer navigation
- Type definitions (CellType, CellVisual, LayerVisual, etc.)

### Design

#### 4a. Extract grid-building into `utils/structure-layers.ts`
Move all pure functions and shared types:

**Types:** `CellType`, `CellVisual`, `LayerVisual`, `LegendEntry`, `LayerMaterial`, `GridPosition`, `LayerDraft`

**Functions:** `buildTurbineLayers`, `buildBoilerLayers`, `createBaseGrid`, `createRotorLayer`, `createRotationalComplexLayer`, `createCoilLayer`, `createVentLayer`, `createWaterLayer`, `createPartialCondenserLayer`, `createRectGrid`, `createRectFilledInterior`, `createFilledInterior`, `generateCoilPositions`, `enumerateInteriorPositions`, `summarizeMaterials`, `finalizeLayers`, `makeCell`, `setCell`

**Constants:** `TURBINE_LEGEND`, `BOILER_LEGEND`, `CELL_LABELS`

#### 4b. `TurbineVisualizer` component
- Takes `TurbineSupportPlan` as `@Input()`
- Computes turbine layers via `buildTurbineLayers` from the extracted util
- Owns its own layer slider, navigation state, and legend
- ~50-80 lines TS

#### 4c. `BoilerVisualizer` component
- Takes `BoilerSupportPlan` as `@Input()`
- Computes boiler layers via `buildBoilerLayers` from the extracted util
- Owns its own layer slider, navigation state, and legend
- ~50-80 lines TS

#### 4d. Shared visualizer CSS
Since both visualizers share the same grid cell styles, legend styles, and slider styles:
- Extract shared styles into a `visualizer-shared.css` that both components import
- Each component has its own small CSS file for any component-specific overrides

#### 4e. Remove parent `StructureVisualizer`
- Delete `structure-visualizer.ts`, `structure-visualizer.html`, `structure-visualizer.css`
- The fission planner template directly uses `<app-turbine-visualizer>` and `<app-boiler-visualizer>`
- The boiler visualizer is conditionally rendered with `@if (data.boiler)`
- Tab switching UI is eliminated — both visualizers are shown inline when their data exists

### Files Changed
| File | Action |
|---|---|
| `src/app/utils/structure-layers.ts` | **New** — all grid-building functions and types |
| `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.ts` | **New** |
| `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.html` | **New** |
| `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.css` | **New** |
| `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.ts` | **New** |
| `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.html` | **New** |
| `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.css` | **New** |
| `src/app/tools/minecraft/mekanism/visualizer-shared.css` | **New** — shared grid/legend/slider styles |
| `src/app/tools/minecraft/mekanism/structure-visualizer/` | **Delete** entire directory |
| `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.html` | Replace `<app-structure-visualizer>` with individual visualizers |
| `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.ts` | Update imports |

---

## 5. Testing Strategy

- Existing unit tests for models (`IndustrialTurbine.spec.ts`, `TurbinePowerOptimization.spec.ts`, `ThermoelectricBoilerOptimization.spec.ts`, `cooling-requirements.spec.ts`) should continue to pass unchanged since model files are not being modified.
- `fission-planner.spec.ts` will need updates to reflect the new child components and changed imports.
- `app.spec.ts` may need updates after the routing change from eager to lazy loading — verify the test setup still works with `loadChildren`.
- New extracted utils (`dimension-search.ts`, `format.ts`, `structure-layers.ts`) should be testable via the existing test patterns.
- After each refactor step, run `ng build` and `ng test` to verify nothing breaks.

---

## 6. Migration Order

The refactor should be done in this order to minimize breakage at each step:

1. **Extract utils first** (dimension-search, format, structure-layers) — pure extractions, no UI change
2. **Create child components** (ConstructionSummary, PerformanceCard, TurbineVisualizer, BoilerVisualizer) — new files, not yet wired in
3. **Wire up fission planner to use new components** — swap template to use children, remove old code
4. **Delete old StructureVisualizer**
5. **Set up lazy-loaded tools routing + ToolsLayout**
6. **Migrate CSS to `--tool-*` tokens**
7. **Verify build and tests pass**

---

## Summary of New Files

```
src/app/
  utils/
    dimension-search.ts          (new)
    format.ts                    (new)
    structure-layers.ts          (new)
    index.ts                     (updated)
  tools/
    tools.routes.ts              (new)
    tools-layout/
      tools-layout.ts            (new)
      tools-layout.html          (new)
      tools-layout.css           (new)
    minecraft/mekanism/
      visualizer-shared.css      (new)
      construction-summary/
        construction-summary.ts  (new)
        construction-summary.html(new)
        construction-summary.css (new)
      performance-card/
        performance-card.ts      (new)
        performance-card.html    (new)
        performance-card.css     (new)
      turbine-visualizer/
        turbine-visualizer.ts    (new)
        turbine-visualizer.html  (new)
        turbine-visualizer.css   (new)
      boiler-visualizer/
        boiler-visualizer.ts     (new)
        boiler-visualizer.html   (new)
        boiler-visualizer.css    (new)
      structure-visualizer/      (deleted)
```
