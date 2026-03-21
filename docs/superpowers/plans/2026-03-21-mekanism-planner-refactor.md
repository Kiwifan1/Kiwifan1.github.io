# Mekanism Planner Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Mekanism Fission Planner into smaller, focused components with lazy-loaded routing, a unified CSS token system, and split visualizers.

**Architecture:** Extract pure computation into utils, decompose the monolithic fission planner and structure visualizer into focused child components, introduce a ToolsLayout with lazy-loaded routing for the tools section, and unify all tool CSS under a `--tool-*` token layer derived from the global theme.

**Tech Stack:** Angular 20 (standalone components, signals, reactive forms), TypeScript 5.9, Jasmine/Karma

**Spec:** `docs/superpowers/specs/2026-03-21-mekanism-planner-refactor-design.md`

---

## File Structure

```
src/app/
  app.routes.ts                                    (modify — lazy tools, add /resume)
  app.spec.ts                                      (modify — update for lazy routes)
  navbar/navbar.html                               (modify — add Resume link)
  utils/
    dimension-search.ts                            (new)
    format.ts                                      (new)
    structure-layers.ts                            (new)
    index.ts                                       (modify — add re-exports)
  tools/
    tools.routes.ts                                (new)
    tools-layout/
      tools-layout.ts                              (new)
      tools-layout.html                            (new)
      tools-layout.css                             (new)
    minecraft/mekanism/
      visualizer-shared.css                        (new)
      construction-summary/
        construction-summary.ts                    (new)
        construction-summary.html                  (new)
        construction-summary.css                   (new)
      performance-card/
        performance-card.ts                        (new)
        performance-card.html                      (new)
        performance-card.css                       (new)
      turbine-visualizer/
        turbine-visualizer.ts                      (new)
        turbine-visualizer.html                    (new)
        turbine-visualizer.css                     (new)
      boiler-visualizer/
        boiler-visualizer.ts                       (new)
        boiler-visualizer.html                     (new)
        boiler-visualizer.css                      (new)
      fission-planner/
        fission-planner.ts                         (modify — slim down)
        fission-planner.html                       (modify — use child components)
        fission-planner.css                        (modify — migrate tokens)
        fission-planner.spec.ts                    (modify — update imports)
      mekanism.ts                                  (modify — update imports)
      mekanism.css                                 (modify — migrate tokens)
      structure-visualizer/                        (delete)
```

---

### Task 1: Extract formatting helpers to `utils/format.ts`

**Files:**
- Create: `src/app/utils/format.ts`

- [ ] **Step 1: Create `utils/format.ts`**

```ts
export function asNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function asDecimal(value: number, digits: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function describeCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : plural ?? `${singular}s`;
  return `${asNumber(count)} ${label}`;
}
```

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS (new file, nothing imports it yet)

- [ ] **Step 3: Commit**

```bash
git add src/app/utils/format.ts
git commit -m "Extract formatting helpers to utils/format.ts"
```

---

### Task 2: Extract dimension search to `utils/dimension-search.ts`

**Files:**
- Create: `src/app/utils/dimension-search.ts`

- [ ] **Step 1: Create `utils/dimension-search.ts`**

Copy `selectTurbineDimensions`, `selectBoilerDimensions`, and `compareScores` from `fission-planner.ts:232-371`. Add necessary imports:

```ts
import {
  BoilerDimensions,
  TurbineDimensions,
} from './cooling-requirements';
import { IndustrialTurbine } from '../models/IndustrialTurbine';
import { PowerOptimization } from '../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization } from '../models/ThermoelectricBoilerOptimization';
import { BOILER } from '../models/constants';

export function selectTurbineDimensions(steamDemand: number, waterDemand: number): TurbineDimensions {
  // exact copy from fission-planner.ts:232-289
}

export function selectBoilerDimensions(heatDemand: number, steamDemand: number): BoilerDimensions {
  // exact copy from fission-planner.ts:291-360
}

function compareScores(a: number[], b: number[]): number {
  // exact copy from fission-planner.ts:362-371
}
```

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/app/utils/dimension-search.ts
git commit -m "Extract dimension search logic to utils"
```

---

### Task 3: Extract grid-building to `utils/structure-layers.ts`

**Files:**
- Create: `src/app/utils/structure-layers.ts`

- [ ] **Step 1: Create `utils/structure-layers.ts`**

Move all types, constants, and pure functions from `structure-visualizer.ts`. This includes:

**Types to export:** `CellType`, `CellVisual`, `LayerVisual`, `LegendEntry`, `LayerMaterial`, `GridPosition`, `LayerDraft`

**Constants to export:** `TURBINE_LEGEND`, `BOILER_LEGEND`, `CELL_LABELS`

**Functions to export:** `buildTurbineLayers`, `buildBoilerLayers`

**Internal functions (not exported):** `finalizeLayers`, `createBaseGrid`, `createRotorLayer`, `createRotationalComplexLayer`, `createVentLayer`, `createCoilLayer`, `createPartialCondenserLayer`, `createRectGrid`, `createRectFilledInterior`, `createFilledInterior`, `generateCoilPositions`, `enumerateInteriorPositions`, `summarizeMaterials`, `makeCell`, `setCell`, `createWaterLayer`

Import `TurbineSupportPlan` and `BoilerSupportPlan` from `./cooling-requirements`.

The file should be a direct copy of `structure-visualizer.ts:7-658` excluding the `@Component` class itself and the `cloneSerializable` helper. Keep only the pure data-building logic.

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/app/utils/structure-layers.ts
git commit -m "Extract grid-building logic to utils/structure-layers.ts"
```

---

### Task 4: Update `utils/index.ts` re-exports

**Files:**
- Modify: `src/app/utils/index.ts`

- [ ] **Step 1: Add re-exports**

Replace content with:

```ts
export * from './cooling-requirements';
export * from './dimension-search';
export * from './format';
export * from './structure-layers';
```

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/app/utils/index.ts
git commit -m "Update utils barrel exports"
```

---

### Task 5: Create shared visualizer CSS

**Files:**
- Create: `src/app/tools/minecraft/mekanism/visualizer-shared.css`

- [ ] **Step 1: Create shared CSS**

Extract the grid cell colors, legend swatches, slider, materials, and cell base styles from `structure-visualizer.css`. These are shared between turbine and boiler visualizers:

```css
.visualizer {
  background: var(--tool-surface);
  border: 1px solid var(--tool-border);
  border-radius: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.visualizer__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.visualizer__layer {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.visualizer__slider {
  align-items: center;
  display: flex;
  gap: 0.75rem;
}

.visualizer__slider input[type='range'] {
  flex: 1 1 auto;
}

.visualizer__slider-label {
  color: var(--tool-muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.visualizer__layer-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.visualizer__layer-description,
.visualizer__layer-repeat {
  color: var(--tool-muted);
  font-size: 0.9rem;
  margin: 0;
}

.visualizer__content {
  display: grid;
  gap: 1.25rem;
}

.visualizer__grid {
  display: grid;
  gap: 0.25rem;
  justify-content: center;
}

.visualizer__cell {
  aspect-ratio: 1;
  border-radius: 0.35rem;
  border: 1px solid rgba(0, 0, 0, 0.4);
  min-width: 1.4rem;
  transition: transform 120ms ease;
}

.visualizer__cell:hover,
.visualizer__cell:focus-visible {
  transform: translateY(-2px);
}

.visualizer__cell--casing { background: #2f2f2f; }
.visualizer__cell--rotor { background: #9e9e9e; }
.visualizer__cell--blade { background: #cfd8dc; }
.visualizer__cell--coil { background: #ff9800; }
.visualizer__cell--complex { background: #ffe082; }
.visualizer__cell--vent { background: #81c784; }
.visualizer__cell--empty { background: rgba(255, 255, 255, 0.08); }
.visualizer__cell--superheater { background: #ef5350; }
.visualizer__cell--disperser { background: #ab47bc; }
.visualizer__cell--condenser { background: #81d4fa; }

.visualizer__legend {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.visualizer__legend li {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  color: var(--tool-muted);
  font-size: 0.9rem;
}

.visualizer__legend-swatch {
  border-radius: 0.35rem;
  flex: 0 0 1.25rem;
  height: 1.25rem;
}

.visualizer__legend-swatch--casing { background: #2f2f2f; }
.visualizer__legend-swatch--rotor { background: #9e9e9e; }
.visualizer__legend-swatch--blade { background: #cfd8dc; }
.visualizer__legend-swatch--complex { background: #ffe082; }
.visualizer__legend-swatch--coil { background: #ff9800; }
.visualizer__legend-swatch--condenser { background: #81d4fa; }
.visualizer__legend-swatch--disperser { background: #ab47bc; }
.visualizer__legend-swatch--vent { background: #81c784; }
.visualizer__legend-swatch--superheater { background: #ef5350; }
.visualizer__legend-swatch--empty { background: rgba(255, 255, 255, 0.08); }

.visualizer__materials {
  display: grid;
  gap: 0.35rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
}

.visualizer__materials li {
  align-items: center;
  display: flex;
  gap: 0.6rem;
  justify-content: flex-start;
  color: var(--tool-muted);
  font-size: 0.88rem;
}

.visualizer__materials-count {
  color: var(--tool-text);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.visualizer__materials-label {
  flex: 1 1 auto;
  line-height: 1.25;
}

.visualizer__empty {
  color: var(--tool-muted);
  font-size: 0.95rem;
  margin: 0;
}
```

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/app/tools/minecraft/mekanism/visualizer-shared.css
git commit -m "Add shared visualizer CSS for tool components"
```

---

### Task 6: Create `TurbineVisualizer` component

**Files:**
- Create: `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.ts`
- Create: `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.html`
- Create: `src/app/tools/minecraft/mekanism/turbine-visualizer/turbine-visualizer.css`

- [ ] **Step 1: Create `turbine-visualizer.ts`**

```ts
import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { TurbineSupportPlan } from '../../../../utils/cooling-requirements';
import { buildTurbineLayers, LayerVisual, TURBINE_LEGEND } from '../../../../utils/structure-layers';

@Component({
  selector: 'app-turbine-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './turbine-visualizer.html',
  styleUrls: ['../visualizer-shared.css', './turbine-visualizer.css'],
})
export class TurbineVisualizer {
  @Input()
  set plan(value: TurbineSupportPlan | null | undefined) {
    this._plan.set(value ? JSON.parse(JSON.stringify(value)) : null);
  }

  public readonly legend = TURBINE_LEGEND;

  private readonly _plan = signal<TurbineSupportPlan | null>(null);

  public readonly layers = computed<LayerVisual[]>(() => {
    const plan = this._plan();
    return plan ? buildTurbineLayers(plan) : [];
  });

  public readonly activeIndex = signal(0);
  public readonly layerCount = computed(() => this.layers().length);
  public readonly maxIndex = computed(() => Math.max(this.layerCount() - 1, 0));
  public readonly displayIndex = computed(() =>
    this.layerCount() === 0 ? 0 : this.activeIndex() + 1
  );

  public readonly activeLayer = computed<LayerVisual | null>(() => {
    const all = this.layers();
    if (all.length === 0) return null;
    const idx = Math.min(Math.max(this.activeIndex(), 0), all.length - 1);
    return all[idx];
  });

  public onSliderInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const val = Number.parseInt(el.value, 10);
    if (Number.isFinite(val)) this.activeIndex.set(val);
  }

  public gridTemplateColumns(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) return '';
    const width = layer.grid[0]?.length ?? 0;
    return width > 0 ? `repeat(${width}, minmax(0, 1fr))` : '';
  }

  public gridTemplateRows(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) return '';
    return `repeat(${layer.grid.length}, minmax(0, 1fr))`;
  }
}
```

- [ ] **Step 2: Create `turbine-visualizer.html`**

```html
<section class="visualizer" aria-label="Industrial turbine assembly guide">
  @if (activeLayer(); as layer) {
    <header class="visualizer__header">
      <div class="visualizer__layer">
        <label class="visualizer__slider">
          <span class="visualizer__slider-label">
            Layer {{ displayIndex() }} / {{ layerCount() }}
          </span>
          <input
            type="range"
            [min]="0"
            [max]="maxIndex()"
            [value]="activeIndex()"
            [disabled]="layerCount() <= 1"
            (input)="onSliderInput($event)"
          />
        </label>
        <p class="visualizer__layer-name">{{ layer.name }}</p>
        <p class="visualizer__layer-description">{{ layer.description }}</p>
        @if (layer.repeatHint) {
          <p class="visualizer__layer-repeat">{{ layer.repeatHint }}</p>
        }
        @if (layer.materials.length > 0) {
          <ul class="visualizer__materials">
            @for (material of layer.materials; track material.type) {
              <li>
                <span class="visualizer__materials-count">{{ material.count }}</span>
                <span class="visualizer__materials-label">{{ material.label }}</span>
              </li>
            }
          </ul>
        }
      </div>
    </header>

    <div class="visualizer__content">
      <div
        class="visualizer__grid"
        [style.gridTemplateColumns]="gridTemplateColumns(layer)"
        [style.gridTemplateRows]="gridTemplateRows(layer)"
      >
        @for (row of layer.grid; track $index) {
          @for (cell of row; track $index) {
            <div
              class="visualizer__cell visualizer__cell--{{ cell.type }}"
              role="img"
              [attr.aria-label]="cell.label"
              [title]="cell.label"
            ></div>
          }
        }
      </div>
      <ul class="visualizer__legend">
        @for (entry of legend; track entry.type) {
          <li>
            <span class="visualizer__legend-swatch visualizer__legend-swatch--{{ entry.type }}"></span>
            <span>{{ entry.label }}</span>
          </li>
        }
      </ul>
    </div>
  } @else {
    <p class="visualizer__empty">Turbine data is unavailable.</p>
  }
</section>
```

- [ ] **Step 3: Create `turbine-visualizer.css`** (empty — all styles come from shared)

```css
/* Component-specific overrides (if any) go here. */
```

- [ ] **Step 4: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/minecraft/mekanism/turbine-visualizer/
git commit -m "Add TurbineVisualizer component"
```

---

### Task 7: Create `BoilerVisualizer` component

**Files:**
- Create: `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.ts`
- Create: `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.html`
- Create: `src/app/tools/minecraft/mekanism/boiler-visualizer/boiler-visualizer.css`

- [ ] **Step 1: Create `boiler-visualizer.ts`**

```ts
import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { BoilerSupportPlan } from '../../../../utils/cooling-requirements';
import { buildBoilerLayers, LayerVisual, BOILER_LEGEND } from '../../../../utils/structure-layers';

@Component({
  selector: 'app-boiler-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boiler-visualizer.html',
  styleUrls: ['../visualizer-shared.css', './boiler-visualizer.css'],
})
export class BoilerVisualizer {
  @Input()
  set plan(value: BoilerSupportPlan | null | undefined) {
    this._plan.set(value ? JSON.parse(JSON.stringify(value)) : null);
  }

  public readonly legend = BOILER_LEGEND;

  private readonly _plan = signal<BoilerSupportPlan | null>(null);

  public readonly layers = computed<LayerVisual[]>(() => {
    const plan = this._plan();
    return plan ? buildBoilerLayers(plan) : [];
  });

  public readonly activeIndex = signal(0);
  public readonly layerCount = computed(() => this.layers().length);
  public readonly maxIndex = computed(() => Math.max(this.layerCount() - 1, 0));
  public readonly displayIndex = computed(() =>
    this.layerCount() === 0 ? 0 : this.activeIndex() + 1
  );

  public readonly activeLayer = computed<LayerVisual | null>(() => {
    const all = this.layers();
    if (all.length === 0) return null;
    const idx = Math.min(Math.max(this.activeIndex(), 0), all.length - 1);
    return all[idx];
  });

  public onSliderInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const val = Number.parseInt(el.value, 10);
    if (Number.isFinite(val)) this.activeIndex.set(val);
  }

  public gridTemplateColumns(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) return '';
    const width = layer.grid[0]?.length ?? 0;
    return width > 0 ? `repeat(${width}, minmax(0, 1fr))` : '';
  }

  public gridTemplateRows(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) return '';
    return `repeat(${layer.grid.length}, minmax(0, 1fr))`;
  }
}
```

- [ ] **Step 2: Create `boiler-visualizer.html`**

```html
<section class="visualizer" aria-label="Thermoelectric boiler assembly guide">
  @if (activeLayer(); as layer) {
    <header class="visualizer__header">
      <div class="visualizer__layer">
        <label class="visualizer__slider">
          <span class="visualizer__slider-label">
            Layer {{ displayIndex() }} / {{ layerCount() }}
          </span>
          <input
            type="range"
            [min]="0"
            [max]="maxIndex()"
            [value]="activeIndex()"
            [disabled]="layerCount() <= 1"
            (input)="onSliderInput($event)"
          />
        </label>
        <p class="visualizer__layer-name">{{ layer.name }}</p>
        <p class="visualizer__layer-description">{{ layer.description }}</p>
        @if (layer.repeatHint) {
          <p class="visualizer__layer-repeat">{{ layer.repeatHint }}</p>
        }
        @if (layer.materials.length > 0) {
          <ul class="visualizer__materials">
            @for (material of layer.materials; track material.type) {
              <li>
                <span class="visualizer__materials-count">{{ material.count }}</span>
                <span class="visualizer__materials-label">{{ material.label }}</span>
              </li>
            }
          </ul>
        }
      </div>
    </header>

    <div class="visualizer__content">
      <div
        class="visualizer__grid"
        [style.gridTemplateColumns]="gridTemplateColumns(layer)"
        [style.gridTemplateRows]="gridTemplateRows(layer)"
      >
        @for (row of layer.grid; track $index) {
          @for (cell of row; track $index) {
            <div
              class="visualizer__cell visualizer__cell--{{ cell.type }}"
              role="img"
              [attr.aria-label]="cell.label"
              [title]="cell.label"
            ></div>
          }
        }
      </div>
      <ul class="visualizer__legend">
        @for (entry of legend; track entry.type) {
          <li>
            <span class="visualizer__legend-swatch visualizer__legend-swatch--{{ entry.type }}"></span>
            <span>{{ entry.label }}</span>
          </li>
        }
      </ul>
    </div>
  } @else {
    <p class="visualizer__empty">No boiler is required for this configuration.</p>
  }
</section>
```

- [ ] **Step 3: Create `boiler-visualizer.css`** (empty — all styles come from shared)

```css
/* Component-specific overrides (if any) go here. */
```

- [ ] **Step 4: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/minecraft/mekanism/boiler-visualizer/
git commit -m "Add BoilerVisualizer component"
```

---

### Task 8: Create `PerformanceCard` component

**Files:**
- Create: `src/app/tools/minecraft/mekanism/performance-card/performance-card.ts`
- Create: `src/app/tools/minecraft/mekanism/performance-card/performance-card.html`
- Create: `src/app/tools/minecraft/mekanism/performance-card/performance-card.css`

- [ ] **Step 1: Create `performance-card.ts`**

```ts
import { Component, Input } from '@angular/core';
import { asNumber } from '../../../../utils/format';

@Component({
  selector: 'app-performance-card',
  standalone: true,
  templateUrl: './performance-card.html',
  styleUrl: './performance-card.css',
})
export class PerformanceCard {
  @Input({ required: true }) burnRate!: number;
  @Input({ required: true }) safeBurnRate!: number;
  @Input({ required: true }) steamDemand!: number;
  @Input({ required: true }) powerPerTick!: number;
  @Input() waterDemand?: number;

  public format(value: number): string {
    return asNumber(value);
  }
}
```

- [ ] **Step 2: Create `performance-card.html`**

```html
<section class="planner__card">
  <h2>Performance</h2>
  <ul>
    <li>Max burn rate: <strong>{{ format(burnRate) }} mB/t</strong></li>
    <li>Safe burn rate with plan: <strong>{{ format(safeBurnRate) }} mB/t</strong></li>
    <li>Steam demand: <strong>{{ format(steamDemand) }} mB/t</strong></li>
    @if (waterDemand) {
      <li>Water demand: <strong>{{ format(waterDemand) }} mB/t</strong></li>
    }
    <li>Estimated output: <strong>{{ format(powerPerTick) }} FE/t</strong></li>
  </ul>
</section>
```

- [ ] **Step 3: Create `performance-card.css`**

```css
.planner__card {
  background: var(--tool-surface);
  border: 1px solid var(--tool-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.planner__card h2 {
  font-size: 1.1rem;
  margin: 0;
}

.planner__card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.planner__card li {
  color: var(--tool-muted);
}

.planner__card strong {
  color: var(--tool-text);
}
```

- [ ] **Step 4: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/minecraft/mekanism/performance-card/
git commit -m "Add PerformanceCard component"
```

---

### Task 9: Create `ConstructionSummary` component

**Files:**
- Create: `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.ts`
- Create: `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.html`
- Create: `src/app/tools/minecraft/mekanism/construction-summary/construction-summary.css`

- [ ] **Step 1: Create `construction-summary.ts`**

```ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ShellBreakdown } from '../../../../models/Shell';
import { asNumber } from '../../../../utils/format';

export interface ConstructionItem {
  label: string;
  value: number;
}

export interface GeometryNote {
  label: string;
  value: number;
}

@Component({
  selector: 'app-construction-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './construction-summary.html',
  styleUrl: './construction-summary.css',
})
export class ConstructionSummary {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) shell!: ShellBreakdown;
  @Input({ required: true }) items!: ConstructionItem[];
  @Input() geometryNotes?: GeometryNote[];

  public format(value: number): string {
    return asNumber(value);
  }
}
```

- [ ] **Step 2: Create `construction-summary.html`**

```html
<div>
  <h3>{{ title }}</h3>
  <ul class="construction-list">
    <li>
      Shell casing (solid): {{ format(shell.solid.casing) }}
    </li>
    <li>
      Glass-ready faces: {{ format(shell.withGlass.casing) }} casing &middot;
      {{ format(shell.withGlass.glass) }} glass
    </li>
    @for (item of items; track item.label) {
      <li>{{ item.label }}: {{ format(item.value) }}</li>
    }
  </ul>
  @if (geometryNotes && geometryNotes.length > 0) {
    <p class="construction-note">
      @for (note of geometryNotes; track note.label; let last = $last) {
        {{ note.label }}: {{ note.value }}{{ last ? '' : ' &middot; ' }}
      }
    </p>
  }
</div>
```

- [ ] **Step 3: Create `construction-summary.css`**

```css
.construction-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--tool-muted);
}

.construction-note {
  margin-top: 0.5rem;
  color: var(--tool-muted);
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/minecraft/mekanism/construction-summary/
git commit -m "Add ConstructionSummary component"
```

---

### Task 10: Wire fission planner to use new components

**Files:**
- Modify: `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.ts`
- Modify: `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.html`
- Modify: `src/app/tools/minecraft/mekanism/mekanism.ts`

- [ ] **Step 1: Update `fission-planner.ts`**

Key changes:
- Remove `selectTurbineDimensions`, `selectBoilerDimensions`, `compareScores` functions (lines 232-371). Import from `../../../../utils/dimension-search`.
- Remove `asNumber`, `asDecimal`, `describeCount` methods. Import from `../../../../utils/format`.
- Remove `StructureVisualizer` import. Add `TurbineVisualizer`, `BoilerVisualizer`, `PerformanceCard`, `ConstructionSummary` to imports.
- Keep the `FissionPlanner` class with form logic, `recomputePlan`, `toggleCooling`, `toggleBoiler`, and `computePlan`.
- The `asNumber`, `asDecimal`, `describeCount` methods on the class should delegate to the imported functions (since they're called from the template, they still need to be methods or the template needs updating). Simplest: keep thin wrappers.

```ts
import { selectTurbineDimensions, selectBoilerDimensions } from '../../../../utils/dimension-search';
import { asNumber, asDecimal, describeCount } from '../../../../utils/format';
import { TurbineVisualizer } from '../turbine-visualizer/turbine-visualizer';
import { BoilerVisualizer } from '../boiler-visualizer/boiler-visualizer';
import { PerformanceCard } from '../performance-card/performance-card';
import { ConstructionSummary } from '../construction-summary/construction-summary';
```

Update `imports` array in `@Component`:
```ts
imports: [CommonModule, ReactiveFormsModule, TurbineVisualizer, BoilerVisualizer, PerformanceCard, ConstructionSummary],
```

Remove the `StructureVisualizer` import line.

- [ ] **Step 2: Rewrite `fission-planner.html`**

Replace the entire template to use the new child components and Angular `@if`/`@for` control flow. Key replacements:
- `*ngIf="error(); else resultBlock"` → `@if (error(); as err) { ... } @else { ... }`
- `*ngIf="result() as data"` → `@if (result(); as data) { ... }`
- The Performance `<section>` → `<app-performance-card>`
- The 4 construction `<div class="planner__construction">` blocks → 4 `<app-construction-summary>` instances
- `<app-structure-visualizer>` → `<app-turbine-visualizer>` and `@if (data.boiler) { <app-boiler-visualizer> }`

For `ConstructionSummary`, build the `items` array inline. Example for turbine per-unit:
```html
<app-construction-summary
  title="Construction (per turbine)"
  [shell]="turbineBuild.perUnit.shell"
  [items]="[
    { label: 'Rotor shafts', value: turbineBuild.perUnit.internals.rotorShaft },
    { label: 'Rotor blades', value: turbineBuild.perUnit.internals.rotorBlades },
    { label: 'Electromagnetic coils', value: turbineBuild.perUnit.internals.electromagneticCoils },
    { label: 'Pressure dispersers', value: turbineBuild.perUnit.internals.pressureDispersers },
    { label: 'Saturating condensers', value: turbineBuild.perUnit.internals.saturatingCondensers },
    { label: 'Venting (ceiling)', value: turbineBuild.perUnit.internals.vents.ceiling },
    { label: 'Venting (sides)', value: turbineBuild.perUnit.internals.vents.sides }
  ]"
  [geometryNotes]="[
    { label: 'Rotor layers', value: turbineBuild.perUnit.geometry.rotorLayers },
    { label: 'Vent layers', value: turbineBuild.perUnit.geometry.ventLayers }
  ]"
></app-construction-summary>
```

- [ ] **Step 3: Update `mekanism.ts`** — remove `StructureVisualizer` import if present (currently not imported here, but verify).

- [ ] **Step 4: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 5: Verify tests**

Run: `npx ng test --watch=false`
Expected: All existing tests pass. `fission-planner.spec.ts` should still work since it tests via `component.result()`.

- [ ] **Step 6: Commit**

```bash
git add src/app/tools/minecraft/mekanism/fission-planner/ src/app/tools/minecraft/mekanism/mekanism.ts
git commit -m "Wire fission planner to use extracted child components"
```

---

### Task 11: Delete old `StructureVisualizer`

**Files:**
- Delete: `src/app/tools/minecraft/mekanism/structure-visualizer/structure-visualizer.ts`
- Delete: `src/app/tools/minecraft/mekanism/structure-visualizer/structure-visualizer.html`
- Delete: `src/app/tools/minecraft/mekanism/structure-visualizer/structure-visualizer.css`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "structure-visualizer" src/` — should return nothing.

- [ ] **Step 2: Delete the directory**

```bash
rm -rf src/app/tools/minecraft/mekanism/structure-visualizer
```

- [ ] **Step 3: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add -A src/app/tools/minecraft/mekanism/structure-visualizer
git commit -m "Remove old StructureVisualizer"
```

---

### Task 12: Create `ToolsLayout` component and lazy-loaded routes

**Files:**
- Create: `src/app/tools/tools-layout/tools-layout.ts`
- Create: `src/app/tools/tools-layout/tools-layout.html`
- Create: `src/app/tools/tools-layout/tools-layout.css`
- Create: `src/app/tools/tools.routes.ts`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Create `tools-layout.ts`**

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tools-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './tools-layout.html',
  styleUrl: './tools-layout.css',
})
export class ToolsLayout {}
```

- [ ] **Step 2: Create `tools-layout.html`**

```html
<div class="tools-shell">
  <router-outlet></router-outlet>
</div>
```

- [ ] **Step 3: Create `tools-layout.css`**

```css
:host {
  display: block;

  --tool-surface: var(--surface);
  --tool-border: var(--surface-border);
  --tool-accent: var(--kiwi-green);
  --tool-accent-strong: var(--kiwi-lime);
  --tool-text: var(--kiwi-fore);
  --tool-muted: var(--text-muted);
  --tool-input-bg: var(--surface-strong);
}

.tools-shell {
  width: min(1100px, calc(100% - 2 * var(--space-xl)));
  margin: 0 auto;
  padding-block: var(--space-xxl);
  display: grid;
  gap: var(--space-xl);
}
```

- [ ] **Step 4: Create `tools.routes.ts`**

```ts
import { Routes } from '@angular/router';
import { ToolsLayout } from './tools-layout/tools-layout';

export default [
  {
    path: '',
    component: ToolsLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./tools').then(m => m.Tools),
      },
      {
        path: 'minecraft',
        loadComponent: () => import('./minecraft/minecraft').then(m => m.Minecraft),
      },
      {
        path: 'minecraft/mekanism',
        loadComponent: () => import('./minecraft/mekanism/mekanism').then(m => m.MekanismPlanner),
      },
    ],
  },
] satisfies Routes;
```

- [ ] **Step 5: Update `app.routes.ts`**

Replace with:

```ts
import { Routes } from '@angular/router';
import { Home } from './home/home';
import { About } from './about/about';
import { Links } from './links/links';
import { Resume } from './resume/resume';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'links', component: Links },
  { path: 'resume', component: Resume },
  {
    path: 'tools',
    loadChildren: () => import('./tools/tools.routes'),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 6: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 7: Commit**

```bash
git add src/app/tools/tools-layout/ src/app/tools/tools.routes.ts src/app/app.routes.ts
git commit -m "Add ToolsLayout with lazy-loaded tools routing"
```

---

### Task 13: Add Resume to navbar

**Files:**
- Modify: `src/app/navbar/navbar.html`

- [ ] **Step 1: Add Resume link**

Add after the About `<li>` in `navbar.html`:

```html
<li><a routerLink="/resume" routerLinkActive="is-active">Resume</a></li>
```

- [ ] **Step 2: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/app/navbar/navbar.html
git commit -m "Add Resume link to navbar"
```

---

### Task 14: Migrate CSS to `--tool-*` tokens

**Files:**
- Modify: `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.css`
- Modify: `src/app/tools/minecraft/mekanism/mekanism.css`

- [ ] **Step 1: Update `fission-planner.css`**

Replace all orphaned custom property references:
- `var(--kiwi-surface, #111)` → `var(--tool-surface)`
- `var(--kiwi-border, #222)` → `var(--tool-border)`
- `var(--kiwi-input-bg, #090909)` → `var(--tool-input-bg)`
- `var(--kiwi-text, #f5f5f5)` and `var(--kiwi-text, #fff)` → `var(--tool-text)`
- `var(--kiwi-muted, ...)` → `var(--tool-muted)`
- `var(--kiwi-accent, #4caf50)` → `var(--tool-accent)`
- `var(--kiwi-accent-strong, #66bb6a)` → `var(--tool-accent-strong)`

- [ ] **Step 2: Update `mekanism.css`** — already uses global tokens (`--surface`, `--text-muted`, `--kiwi-green`, `--kiwi-fore`). These are fine as-is since they reference real global tokens, not the orphaned `--kiwi-surface` etc. No changes needed here.

- [ ] **Step 3: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/minecraft/mekanism/fission-planner/fission-planner.css
git commit -m "Migrate fission planner CSS to --tool-* tokens"
```

---

### Task 15: Update tests

**Files:**
- Modify: `src/app/app.spec.ts`
- Modify: `src/app/tools/minecraft/mekanism/fission-planner/fission-planner.spec.ts`

- [ ] **Step 1: Update `app.spec.ts`**

Replace `RouterTestingModule` (deprecated in Angular 20) with `provideRouter`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main.app-shell')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Verify `fission-planner.spec.ts`**

The existing tests should still pass since `FissionPlanner` is still a standalone component and its child components are part of its `imports`. Run and verify — no changes expected.

- [ ] **Step 3: Run all tests**

Run: `npx ng test --watch=false`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.spec.ts
git commit -m "Update app.spec.ts for lazy-loaded routing"
```

---

### Task 16: Final verification

- [ ] **Step 1: Full production build**

Run: `npx ng build`
Expected: SUCCESS, no warnings

- [ ] **Step 2: Run all tests**

Run: `npx ng test --watch=false`
Expected: All tests pass

- [ ] **Step 3: Manual smoke test**

Run: `npx ng serve`
Verify:
- `/` — Home page renders with navbar
- `/about` — About page renders
- `/links` — Links page renders
- `/resume` — Resume page renders, navbar shows Resume as active
- `/tools` — Tools page renders in wider layout
- `/tools/minecraft` — Minecraft page renders
- `/tools/minecraft/mekanism` — Fission planner loads, form works, results display correctly
- Toggle water/sodium cooling — results update, boiler section appears for sodium
- Turbine visualizer shows layer slider and grid
- Boiler visualizer shows layer slider and grid (when enabled)
- Performance card shows stats
- Construction summaries show per-unit and total
