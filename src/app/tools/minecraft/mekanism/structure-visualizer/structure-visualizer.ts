import { CommonModule } from '@angular/common';
import { Component, Input, computed, effect, signal, untracked } from '@angular/core';
import { BoilerSupportPlan, TurbineSupportPlan } from '../../../../utils/cooling-requirements';
import {
  BOILER_LEGEND,
  LayerVisual,
  StructureMode,
  TURBINE_LEGEND,
  buildBoilerLayers,
  buildTurbineLayers,
} from './structure-layers';
import { StructureVisualizer3d } from './structure-visualizer-3d';

@Component({
  selector: 'app-structure-visualizer',
  standalone: true,
  imports: [CommonModule, StructureVisualizer3d],
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
  public readonly viewMode = signal<'guide' | 'preview'>('guide');
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
  public readonly hasAnyPlan = computed(() => this.hasBoiler() || this.hasTurbine());

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

  public setViewMode(mode: 'guide' | 'preview'): void {
    this.viewMode.set(mode);
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

function cloneSerializable<T>(value: T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

