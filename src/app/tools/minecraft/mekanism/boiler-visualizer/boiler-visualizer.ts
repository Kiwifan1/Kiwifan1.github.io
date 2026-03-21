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
