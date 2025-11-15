import { CommonModule } from '@angular/common';
import { Component, Input, computed, effect, signal, untracked } from '@angular/core';
import { BoilerSupportPlan, TurbineSupportPlan } from '../../../../utils/cooling-requirements';

export type StructureMode = 'turbine' | 'boiler';

const TURBINE_LEGEND: LegendEntry[] = [
  { type: 'casing', label: 'Turbine casing / ports' },
  { type: 'rotor', label: 'Rotor shaft' },
  { type: 'blade', label: 'Rotor blade' },
  { type: 'complex', label: 'Rotational complex' },
  { type: 'coil', label: 'Electromagnetic coil' },
  { type: 'disperser', label: 'Pressure disperser deck' },
  { type: 'condenser', label: 'Saturating condenser' },
  { type: 'vent', label: 'Turbine vent' },
];

const BOILER_LEGEND: LegendEntry[] = [
  { type: 'casing', label: 'Boiler casing / ports' },
  { type: 'superheater', label: 'Superheating element' },
  { type: 'disperser', label: 'Pressure disperser deck' },
];

const CELL_LABELS: Record<CellType, string> = {
  casing: 'Casing',
  rotor: 'Rotor shaft',
  blade: 'Rotor blade',
  complex: 'Rotational complex',
  coil: 'Electromagnetic coil',
  disperser: 'Pressure disperser',
  vent: 'Turbine vent',
  empty: 'Interior cavity',
  superheater: 'Superheating element',
  condenser: 'Saturating condenser',
};

type CellType =
  | 'casing'
  | 'rotor'
  | 'blade'
  | 'complex'
  | 'coil'
  | 'disperser'
  | 'vent'
  | 'empty'
  | 'superheater'
  | 'condenser';

interface CellVisual {
  type: CellType;
  label: string;
}

interface LayerVisual {
  name: string;
  description: string;
  grid: CellVisual[][];
  repeatHint?: string;
  materials: LayerMaterial[];
}

interface LegendEntry {
  type: CellType;
  label: string;
}

interface LayerMaterial {
  type: CellType;
  label: string;
  count: number;
}

type LayerDraft = Omit<LayerVisual, 'materials'>;

@Component({
  selector: 'app-structure-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './structure-visualizer.html',
  styleUrl: './structure-visualizer.css',
})
export class StructureVisualizer {
  @Input()
  set turbine(value: TurbineSupportPlan | null | undefined) {
    this.turbinePlan.set(cloneSerializable(value));
  }

  @Input()
  set boiler(value: BoilerSupportPlan | null | undefined) {
    this.boilerPlan.set(cloneSerializable(value));
  }

  public readonly turbineLegend = TURBINE_LEGEND;
  public readonly boilerLegend = BOILER_LEGEND;

  public readonly turbinePlan = signal<TurbineSupportPlan | null>(null);
  public readonly boilerPlan = signal<BoilerSupportPlan | null>(null);
  public readonly activeStructure = signal<StructureMode>('turbine');
  public readonly activeLayerIndex = signal(0);
  public readonly activeLayerCount = computed(() => this.activeLayers().length);
  public readonly maxLayerIndex = computed(() => Math.max(this.activeLayerCount() - 1, 0));
  public readonly activeLayerDisplay = computed(() =>
    this.activeLayerCount() === 0 ? 0 : this.activeLayerIndex() + 1
  );

  private readonly turbineLayers = computed<LayerVisual[]>(() => {
    const plan = this.turbinePlan();
    if (!plan) {
      return [];
    }
    return buildTurbineLayers(plan);
  });

  private readonly boilerLayers = computed<LayerVisual[]>(() => {
    const plan = this.boilerPlan();
    if (!plan) {
      return [];
    }
    return buildBoilerLayers(plan);
  });

  public readonly activeLayers = computed<LayerVisual[]>(() =>
    this.activeStructure() === 'turbine' ? this.turbineLayers() : this.boilerLayers()
  );

  public readonly activeLayer = computed<LayerVisual | null>(() => {
    const layers = this.activeLayers();
    if (layers.length === 0) {
      return null;
    }
    const index = Math.min(Math.max(this.activeLayerIndex(), 0), layers.length - 1);
    return layers[index];
  });

  public readonly hasBoiler = computed(() => this.boilerPlan() !== null);
  public readonly hasTurbine = computed(() => this.turbinePlan() !== null);

  constructor() {
    effect(() => {
      const mode = this.activeStructure();
      const plan = mode === 'turbine' ? this.turbinePlan() : this.boilerPlan();
      untracked(() => {
        this.activeLayerIndex.set(0);
      });
      void plan;
    });

    effect(() => {
      const layers = this.activeLayers();
      if (layers.length === 0) {
        this.activeLayerIndex.set(0);
      } else if (this.activeLayerIndex() > layers.length - 1) {
        this.activeLayerIndex.set(layers.length - 1);
      }
    });
  }

  public switchStructure(mode: StructureMode): void {
    if (mode === 'boiler' && !this.hasBoiler()) {
      return;
    }
    if (mode === 'turbine' && !this.hasTurbine()) {
      return;
    }
    this.activeStructure.set(mode);
    this.activeLayerIndex.set(0);
  }

  public onLayerInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const next = Number.parseInt(element.value, 10);
    if (Number.isFinite(next)) {
      this.activeLayerIndex.set(next);
    }
  }

  public gridTemplateColumns(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) {
      return '';
    }
    const width = layer.grid[0]?.length ?? 0;
    return width > 0 ? `repeat(${width}, minmax(0, 1fr))` : '';
  }

  public gridTemplateRows(layer: LayerVisual | null): string {
    if (!layer || layer.grid.length === 0) {
      return '';
    }
    return `repeat(${layer.grid.length}, minmax(0, 1fr))`;
  }
}

function buildTurbineLayers(plan: TurbineSupportPlan): LayerVisual[] {
  const layers: LayerDraft[] = [];
  const geometry = plan.construction.perUnit.geometry;
  const size = plan.configuration.length;
  const rotorLayers = Math.max(geometry.rotorLayers, 0);
  const steamLayers = Math.max(geometry.ventLayers, 0);
  const coilCount = plan.construction.perUnit.internals.electromagneticCoils;
  const condenserCount = plan.construction.perUnit.internals.saturatingCondensers;

  layers.push({
    name: 'Foundation',
    description: 'Frame the footprint with turbine casing and reserve ports for steam, power, and water.',
    grid: createFilledInterior(size, 'casing'),
    repeatHint: `${plan.construction.perUnit.shell.replacements} ports recommended`,
  });

  for (let i = 0; i < rotorLayers; i += 1) {
    layers.push({
      name: `Rotor layer ${i + 1}`,
      description: 'Stack the rotor shaft and attach the paired rotor blades opposite each other (repeat for each rotor layer).',
      grid: createRotorLayer(size),
    });
  }

  layers.push({
    name: 'Rotational complex',
    description: 'Install the rotational complex above the final rotor and surround it with pressure dispersers.',
    grid: createRotationalComplexLayer(size),
  });

  const coilPositions = generateCoilPositions(size, coilCount);
  const coilLayer = createCoilLayer(size, coilPositions, condenserCount);
  layers.push({
    name: 'Electromagnetic coils & condensers',
    description:
      'Place electromagnetic coils as close to the rotational complex as possible; fill remaining spaces on this level with saturating condensers.',
    grid: coilLayer.grid,
  });

  let remainingCondensers = coilLayer.remaining;
  const interiorArea = Math.max((size - 2) * (size - 2), 0);
  const additionalSteamLayers = Math.max(steamLayers - 1, 0);
  if (interiorArea === 0) {
    remainingCondensers = 0;
  }
  const availableCondenserLayers = Math.max(additionalSteamLayers - 1, 0);
  const requiredCondenserLayers = interiorArea > 0 ? Math.ceil(remainingCondensers / interiorArea) : 0;
  const condenserLayersToCreate = Math.min(requiredCondenserLayers, availableCondenserLayers);

  let condenserLayerIndex = 0;
  for (let i = 0; i < condenserLayersToCreate; i += 1) {
    condenserLayerIndex += 1;
    if (remainingCondensers >= interiorArea) {
      layers.push({
        name: `Saturating condenser layer ${condenserLayerIndex}`,
        description: 'Stack additional saturating condensers directly above the coil level.',
        grid: createFilledInterior(size, 'condenser', 'vent', 'casing'),
      });
      remainingCondensers -= interiorArea;
    } else {
      layers.push({
        name: 'Final condenser layer',
        description: 'Place the remaining condensers as shown to finish the turbine interior.',
        grid: createPartialCondenserLayer(size, remainingCondensers),
      });
      remainingCondensers = 0;
    }
  }

  remainingCondensers = Math.max(remainingCondensers, 0);

  const remainingSteamLayers = additionalSteamLayers - condenserLayersToCreate;
  let ventLayerIndex = 0;
  for (let i = 0; i < remainingSteamLayers; i += 1) {
    ventLayerIndex += 1;
    const isLast = i === remainingSteamLayers - 1;
    layers.push({
      name: remainingSteamLayers > 1 ? `Vent crown layer ${ventLayerIndex}` : 'Vent crown',
      description: isLast
        ? 'Cap the structure with turbine vents to release processed steam.'
        : 'Continue stacking turbine vents to build the crown.',
      grid: createVentLayer(size, isLast),
    });
  }

  return finalizeLayers(layers);
}

function buildBoilerLayers(plan: BoilerSupportPlan): LayerVisual[] {
  const layers: LayerDraft[] = [];
  const geometry = plan.construction.perUnit.geometry;
  const width = plan.configuration.width;
  const length = plan.configuration.length;
  const totalHeight = Math.max(plan.configuration.height, 0);
  if (totalHeight === 0) {
    return [];
  }
  const waterLayers = Math.max(geometry.waterLayers, 0);
  const steamLayers = Math.max(geometry.steamLayers, 0);
  const totalSuperheaters = plan.construction.perUnit.internals.superheaters;
  const interiorSlotsPerLayer = Math.max((width - 2) * (length - 2), 0);
  let remainingSuperheaters = totalSuperheaters;

  const interiorLayerCapacity = Math.max(totalHeight - 2, 0);
  const maxWaterLayers = Math.max(interiorLayerCapacity - 1, 0);
  const waterLayersToUse = Math.min(waterLayers, maxWaterLayers);
  const deckReserved = interiorLayerCapacity > waterLayersToUse;
  const steamLayerCapacity = deckReserved ? Math.max(interiorLayerCapacity - waterLayersToUse - 1, 0) : 0;
  const steamLayersToUse = Math.min(steamLayers, steamLayerCapacity);
  const totalSteamSlots = steamLayerCapacity;

  layers.push({
    name: 'Foundation',
    description: 'Frame the boiler footprint with casing and reserve ports for water and steam handling.',
    grid: createRectFilledInterior(width, length, 'casing'),
    repeatHint: `${plan.construction.perUnit.shell.replacements} ports recommended`,
  });

  for (let i = 0; i < waterLayersToUse; i += 1) {
    const layerCapacity = interiorSlotsPerLayer;
    const superheaters = layerCapacity > 0 ? Math.min(remainingSuperheaters, layerCapacity) : 0;
    const layerName = waterLayersToUse > 1 ? `Water cavity layer ${i + 1}` : 'Water cavity';
    layers.push({
      name: layerName,
      description:
        superheaters > 0
          ? remainingSuperheaters > superheaters
            ? `Pack ${superheaters} superheating elements tightly on this level before moving upward.`
            : `Place the final ${superheaters} superheating elements on this level.`
          : 'No hardware required on this level; leave it filled with water.',
      grid: createWaterLayer(width, length, superheaters),
    });
    remainingSuperheaters = Math.max(remainingSuperheaters - superheaters, 0);
  }

  if (deckReserved) {
    layers.push({
      name: 'Pressure disperser deck',
      description: 'Cover the water cavity with pressure dispersers before the steam space.',
      grid: createRectFilledInterior(width, length, 'disperser'),
    });
  }

  for (let i = 0; i < totalSteamSlots; i += 1) {
    const layerName = totalSteamSlots > 1 ? `Steam cavity layer ${i + 1}` : 'Steam cavity';
    const isLastPlanned = i === steamLayersToUse - 1 && i < steamLayersToUse;
    const description =
      i < steamLayersToUse
        ? isLastPlanned
          ? 'Leave this space open for steam output before sealing the boiler.'
          : 'Continue leaving this layer clear for steam expansion.'
        : 'Headroom available for steam expansion; no additional hardware required.';
    layers.push({
      name: layerName,
      description,
      grid: createRectGrid(width, length, 'empty'),
    });
  }

  layers.push({
    name: 'Boiler roof',
    description: 'Seal the boiler with a final casing layer on top of the steam cavity.',
    grid: createRectFilledInterior(width, length, 'casing'),
  });

  return finalizeLayers(layers);
}

function finalizeLayers(layers: LayerDraft[]): LayerVisual[] {
  return layers.map((layer) => ({
    ...layer,
    materials: summarizeMaterials(layer.grid),
  }));
}

function createBaseGrid(
  width: number,
  length: number,
  interior: CellType,
  edge: CellType = 'casing',
  corner: CellType = 'casing'
): CellVisual[][] {
  const grid: CellVisual[][] = [];
  for (let y = 0; y < length; y += 1) {
    const row: CellVisual[] = [];
    for (let x = 0; x < width; x += 1) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === length - 1;
      const isCorner =
        (x === 0 || x === width - 1) && (y === 0 || y === length - 1);
      if (isEdge) {
        row.push(makeCell(isCorner ? corner : edge));
      } else {
        row.push(makeCell(interior));
      }
    }
    grid.push(row);
  }
  return grid;
}

function createRotorLayer(size: number): CellVisual[][] {
  const grid = createBaseGrid(size, size, 'empty');
  const centre = Math.floor((size - 1) / 2);
  setCell(grid, centre, centre, 'rotor');
  const offsets = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];
  for (const offset of offsets) {
    setCell(grid, centre + offset.x, centre + offset.y, 'blade');
  }
  return grid;
}

function createRotationalComplexLayer(size: number): CellVisual[][] {
  const grid = createBaseGrid(size, size, 'disperser', 'vent', 'casing');
  const centre = Math.floor((size - 1) / 2);
  setCell(grid, centre, centre, 'complex');
  return grid;
}

function createVentLayer(size: number, fillCeiling: boolean): CellVisual[][] {
  if (!fillCeiling) {
    return createBaseGrid(size, size, 'empty', 'vent', 'casing');
  }

  const grid = createBaseGrid(size, size, 'empty', 'casing', 'casing');
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      setCell(grid, x, y, 'vent');
    }
  }
  return grid;
}

function createCoilLayer(
  size: number,
  coilPositions: GridPosition[],
  condenserCount: number
): { grid: CellVisual[][]; remaining: number } {
  const grid = createBaseGrid(size, size, 'empty', 'vent', 'casing');
  const used = new Set<string>();
  const interiorSlots = Math.max((size - 2) * (size - 2), 0);
  const limit = Math.min(coilPositions.length, interiorSlots);
  for (let i = 0; i < limit; i += 1) {
    const { x, y } = coilPositions[i];
    setCell(grid, x, y, 'coil');
    used.add(`${x},${y}`);
  }

  let remaining = condenserCount;
  if (remaining > 0) {
    const fillCandidates = enumerateInteriorPositions(size, true);
    for (const pos of fillCandidates) {
      const key = `${pos.x},${pos.y}`;
      if (used.has(key)) {
        continue;
      }
      setCell(grid, pos.x, pos.y, 'condenser');
      used.add(key);
      remaining -= 1;
      if (remaining <= 0) {
        break;
      }
    }
  }

  return { grid, remaining: Math.max(remaining, 0) };
}

function generateCoilPositions(size: number, coilCount: number): GridPosition[] {
  if (coilCount <= 0) {
    return [];
  }

  const interiorLimit = Math.max((size - 2) * (size - 2), 0);
  if (interiorLimit === 0) {
    return [];
  }

  const positions: GridPosition[] = [];
  const seen = new Set<string>();
  const centre = Math.floor((size - 1) / 2);

  const push = (x: number, y: number): void => {
    if (x <= 0 || y <= 0 || x >= size - 1 || y >= size - 1) {
      return;
    }
    const key = `${x},${y}`;
    if (seen.has(key)) {
      return;
    }
    positions.push({ x, y });
    seen.add(key);
  };

  push(centre, centre);

  const maxRadius = size;
  for (let radius = 1; radius <= maxRadius && positions.length < interiorLimit; radius += 1) {
    const candidates = [
      { x: centre + radius, y: centre },
      { x: centre - radius, y: centre },
      { x: centre, y: centre + radius },
      { x: centre, y: centre - radius },
      { x: centre + radius, y: centre + radius },
      { x: centre - radius, y: centre + radius },
      { x: centre + radius, y: centre - radius },
      { x: centre - radius, y: centre - radius },
    ];
    for (const candidate of candidates) {
      push(candidate.x, candidate.y);
      if (positions.length >= interiorLimit) {
        break;
      }
    }
  }

  if (positions.length < interiorLimit) {
    const fallback = enumerateInteriorPositions(size, true);
    for (const pos of fallback) {
      push(pos.x, pos.y);
      if (positions.length >= interiorLimit) {
        break;
      }
    }
  }

  return positions.slice(0, Math.min(coilCount, positions.length));
}

function createPartialCondenserLayer(size: number, condenserCount: number): CellVisual[][] {
  const grid = createBaseGrid(size, size, 'empty', 'vent', 'casing');
  if (condenserCount <= 0) {
    return grid;
  }
  const positions = enumerateInteriorPositions(size, true);
  const limit = Math.min(condenserCount, positions.length);
  for (let i = 0; i < limit; i += 1) {
    const { x, y } = positions[i];
    setCell(grid, x, y, 'condenser');
  }
  return grid;
}

// Clone plans so signal updates fire even when the parent mutates objects in place.
function cloneSerializable<T>(value: T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function summarizeMaterials(grid: CellVisual[][]): LayerMaterial[] {
  const counts = new Map<CellType, number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type === 'empty') {
        continue;
      }
      counts.set(cell.type, (counts.get(cell.type) ?? 0) + 1);
    }
  }
  const entries: LayerMaterial[] = [];
  counts.forEach((count, type) => {
    entries.push({ type, count, label: CELL_LABELS[type] });
  });
  entries.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label);
  });
  return entries;
}

function createFilledInterior(
  size: number,
  type: CellType,
  edge: CellType = 'casing',
  corner: CellType = 'casing'
): CellVisual[][] {
  return createBaseGrid(size, size, type, edge, corner);
}

function createRectGrid(
  width: number,
  length: number,
  interior: CellType,
  edge: CellType = 'casing',
  corner: CellType = 'casing'
): CellVisual[][] {
  return createBaseGrid(width, length, interior, edge, corner);
}

function createRectFilledInterior(
  width: number,
  length: number,
  type: CellType,
  edge: CellType = 'casing',
  corner: CellType = 'casing'
): CellVisual[][] {
  return createBaseGrid(width, length, type, edge, corner);
}

interface GridPosition {
  x: number;
  y: number;
}

function enumerateInteriorPositions(size: number, includeCentre: boolean): GridPosition[] {
  const positions: Array<GridPosition & { radius: number; angle: number }> = [];
  const centre = (size - 1) / 2;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const dx = x - centre;
      const dy = y - centre;
      if (!includeCentre && Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
        continue;
      }
      const radius = Math.max(Math.abs(dx), Math.abs(dy));
      const angle = Math.atan2(dy, dx);
      positions.push({ x, y, radius, angle });
    }
  }
  positions.sort((a, b) => {
    if (a.radius !== b.radius) {
      return a.radius - b.radius;
    }
    return a.angle - b.angle;
  });
  return positions.map(({ x, y }) => ({ x, y }));
}

function createWaterLayer(width: number, length: number, superheaters: number): CellVisual[][] {
  const grid = createRectGrid(width, length, 'empty');
  if (superheaters <= 0) {
    return grid;
  }
  let placed = 0;
  for (let y = 1; y < length - 1 && placed < superheaters; y += 1) {
    for (let x = 1; x < width - 1 && placed < superheaters; x += 1) {
      setCell(grid, x, y, 'superheater');
      placed += 1;
    }
  }
  return grid;
}

function setCell(grid: CellVisual[][], x: number, y: number, type: CellType): void {
  if (y < 0 || y >= grid.length) {
    return;
  }
  if (x < 0 || x >= grid[y].length) {
    return;
  }
  grid[y][x] = makeCell(type);
}

function makeCell(type: CellType): CellVisual {
  return {
    type,
    label: CELL_LABELS[type],
  };
}

