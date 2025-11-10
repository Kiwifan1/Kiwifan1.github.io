import { CommonModule } from '@angular/common';
import { Component, Input, computed, effect, signal } from '@angular/core';
import { BoilerSupportPlan, TurbineSupportPlan } from '../../../../utils/cooling-requirements';

export type StructureMode = 'turbine' | 'boiler';

const TURBINE_LEGEND: LegendEntry[] = [
  { type: 'casing', label: 'Turbine casing / ports' },
  { type: 'rotor', label: 'Rotor shaft' },
  { type: 'blade', label: 'Rotor blade' },
  { type: 'coil', label: 'Electromagnetic coil ring' },
  { type: 'disperser', label: 'Pressure disperser deck' },
  { type: 'vent', label: 'Turbine vent' },
];

const BOILER_LEGEND: LegendEntry[] = [
  { type: 'casing', label: 'Boiler casing / ports' },
  { type: 'water', label: 'Water cavity' },
  { type: 'superheater', label: 'Superheating element' },
  { type: 'heater', label: 'Resistive heating element' },
  { type: 'disperser', label: 'Pressure disperser deck' },
  { type: 'steam', label: 'Steam cavity' },
];

const CELL_LABELS: Record<CellType, string> = {
  casing: 'Casing',
  rotor: 'Rotor shaft',
  blade: 'Rotor blade',
  coil: 'Electromagnetic coil',
  disperser: 'Pressure disperser',
  vent: 'Turbine vent',
  empty: 'Interior cavity',
  water: 'Water cavity',
  superheater: 'Superheating element',
  heater: 'Resistive heating element',
  steam: 'Steam cavity',
};

type CellType =
  | 'casing'
  | 'rotor'
  | 'blade'
  | 'coil'
  | 'disperser'
  | 'vent'
  | 'empty'
  | 'water'
  | 'superheater'
  | 'heater'
  | 'steam';

interface CellVisual {
  type: CellType;
  label: string;
}

interface LayerVisual {
  name: string;
  description: string;
  grid: CellVisual[][];
  repeatHint?: string;
}

interface LegendEntry {
  type: CellType;
  label: string;
}

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
    this.turbinePlan.set(value ?? null);
    if (this.activeStructure() === 'turbine') {
      this.activeLayerIndex.set(0);
    }
  }

  @Input()
  set boiler(value: BoilerSupportPlan | null | undefined) {
    this.boilerPlan.set(value ?? null);
    if (this.activeStructure() === 'boiler') {
      this.activeLayerIndex.set(0);
    }
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
  const layers: LayerVisual[] = [];
  const geometry = plan.construction.perUnit.geometry;
  const size = plan.configuration.length;
  const rotorLayers = Math.max(geometry.rotorLayers, 0);
  const ventLayers = Math.max(geometry.ventLayers, 0);

  layers.push({
    name: 'Foundation',
    description: 'Frame the footprint with turbine casing and reserve ports for steam, power, and water.',
    grid: createBaseGrid(size, size, 'empty'),
    repeatHint: `${plan.construction.perUnit.shell.replacements} ports recommended`,
  });

  for (let i = 0; i < rotorLayers; i += 1) {
    layers.push({
      name: `Rotor layer ${i + 1}`,
      description: 'Stack the rotor shaft and attach blade spokes on all four sides (repeat for each rotor layer).',
      grid: createRotorLayer(size),
    });
  }

  layers.push({
    name: 'Electromagnetic coils',
    description: 'Surround the rotor with electromagnetic coils before sealing the roof.',
    grid: createCoilLayer(size),
  });

  layers.push({
    name: 'Pressure disperser deck',
    description: 'Fill the interior with pressure dispersers to spread incoming steam evenly.',
    grid: createFilledInterior(size, 'disperser'),
  });

  if (ventLayers > 0) {
    layers.push({
      name: 'Vent crown',
      description: ventLayers > 1
        ? `Top ${ventLayers} vent layers finish the turbine interior.`
        : 'Cap the structure with turbine vents to release processed steam.',
      grid: createFilledInterior(size, 'vent'),
      repeatHint: ventLayers > 1 ? `${ventLayers} identical vent layers` : undefined,
    });
  }

  return layers;
}

function buildBoilerLayers(plan: BoilerSupportPlan): LayerVisual[] {
  const layers: LayerVisual[] = [];
  const geometry = plan.construction.perUnit.geometry;
  const width = plan.configuration.width;
  const length = plan.configuration.length;
  const waterLayers = Math.max(geometry.waterLayers, 0);
  const steamLayers = Math.max(geometry.steamLayers, 0);
  const totalSuperheaters = plan.construction.perUnit.internals.superheaters;
  const distribution = distributeAcrossLayers(totalSuperheaters, waterLayers);

  layers.push({
    name: 'Foundation',
    description: 'Frame the boiler footprint with casing and reserve ports for water and steam handling.',
    grid: createRectGrid(width, length, 'empty'),
    repeatHint: `${plan.construction.perUnit.shell.replacements} ports recommended`,
  });

  const interiorCenter = {
    x: Math.floor((width - 1) / 2),
    y: Math.floor((length - 1) / 2),
  };

  for (let i = 0; i < waterLayers; i += 1) {
    const superheaters = distribution[i] ?? 0;
    const isBottomLayer = i === 0;
    layers.push({
      name: `Water cavity layer ${i + 1}`,
      description:
        superheaters > 0
          ? `Place ${superheaters} superheating elements inside the water cavity (leave the remainder filled with water).`
          : 'Fill this layer with water to feed the boiler.',
      grid: createWaterLayer(width, length, superheaters, isBottomLayer ? interiorCenter : undefined),
    });
  }

  layers.push({
    name: 'Pressure disperser deck',
    description: 'Cover the water cavity with pressure dispersers before the steam space.',
    grid: createRectFilledInterior(width, length, 'disperser'),
  });

  if (steamLayers > 0) {
    layers.push({
      name: 'Steam cavity',
      description:
        steamLayers > 1
          ? `Leave the top ${steamLayers} layers open for steam expansion.`
          : 'Leave this space empty for steam output.',
      grid: createRectFilledInterior(width, length, 'steam'),
      repeatHint: steamLayers > 1 ? `${steamLayers} identical steam layers` : undefined,
    });
  }

  return layers;
}

function createBaseGrid(width: number, length: number, interior: CellType): CellVisual[][] {
  const grid: CellVisual[][] = [];
  for (let y = 0; y < length; y += 1) {
    const row: CellVisual[] = [];
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === length - 1;
      row.push(makeCell(edge ? 'casing' : interior));
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
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (const offset of offsets) {
    setCell(grid, centre + offset.x, centre + offset.y, 'blade');
  }
  return grid;
}

function createCoilLayer(size: number): CellVisual[][] {
  const grid = createBaseGrid(size, size, 'coil');
  const centre = Math.floor((size - 1) / 2);
  setCell(grid, centre, centre, 'rotor');
  return grid;
}

function createFilledInterior(size: number, type: CellType): CellVisual[][] {
  return createBaseGrid(size, size, type);
}

function createRectGrid(width: number, length: number, interior: CellType): CellVisual[][] {
  return createBaseGrid(width, length, interior);
}

function createRectFilledInterior(width: number, length: number, type: CellType): CellVisual[][] {
  return createBaseGrid(width, length, type);
}

function createWaterLayer(
  width: number,
  length: number,
  superheaters: number,
  heaterCentre?: { x: number; y: number }
): CellVisual[][] {
  const grid = createRectGrid(width, length, 'water');
  const avoid = new Set<string>();
  if (heaterCentre) {
    setCell(grid, heaterCentre.x, heaterCentre.y, 'heater');
    avoid.add(`${heaterCentre.x},${heaterCentre.y}`);
  }
  if (superheaters <= 0) {
    return grid;
  }
  let placed = 0;
  for (let y = 1; y < length - 1 && placed < superheaters; y += 1) {
    for (let x = 1; x < width - 1 && placed < superheaters; x += 1) {
      const key = `${x},${y}`;
      if (avoid.has(key)) {
        continue;
      }
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

function distributeAcrossLayers(total: number, layers: number): number[] {
  if (layers <= 0) {
    return [];
  }
  const base = Math.floor(total / layers);
  const remainder = total % layers;
  return Array.from({ length: layers }, (_, index) => base + (index < remainder ? 1 : 0));
}
