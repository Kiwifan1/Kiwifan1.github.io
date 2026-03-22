import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThermalEvaporationPlant } from '../../../../models/ThermalEvaporationPlant';
import { EVAP_PLANT } from '../../../../models/constants';
import { asNumber, asDecimal } from '../../../../utils/format';

interface HeightRow {
  height: number;
  rate: number;
}

interface EvaporationResult {
  temp: number;
  productionRate: number;
  inputCapacity: number;
  heatInput: number;
  heatDissipation: number;
  heightTable: HeightRow[];
}

@Component({
  selector: 'app-evaporation-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evaporation-planner.html',
  styleUrl: './evaporation-planner.css',
})
export class EvaporationPlanner {
  private readonly fb = new FormBuilder();

  public readonly form = this.fb.nonNullable.group({
    height: [
      18,
      [
        Validators.required,
        Validators.min(ThermalEvaporationPlant.MIN_HEIGHT),
        Validators.max(ThermalEvaporationPlant.MAX_HEIGHT),
      ],
    ],
    heatSource: ['solar' as 'solar' | 'custom'],
    solarPanels: [
      4,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(4),
      ],
    ],
    customHeat: [
      120,
      [
        Validators.required,
        Validators.min(0),
      ],
    ],
  });

  public readonly result = signal<EvaporationResult | null>(null);
  public readonly error = signal<string | null>(null);

  public readonly asNumber = asNumber;
  public readonly asDecimal = asDecimal;

  constructor() {
    this.computePlan();
  }

  public computePlan(): void {
    try {
      this.error.set(null);
      const { height, heatSource, solarPanels, customHeat } = this.form.getRawValue();

      const h = typeof height === 'number' ? height : Number.parseInt(height, 10);
      const panels = typeof solarPanels === 'number' ? solarPanels : Number.parseInt(solarPanels, 10);
      const heat = typeof customHeat === 'number' ? customHeat : Number.parseFloat(customHeat);

      if (!Number.isFinite(h)) {
        throw new Error('Invalid height value.');
      }

      const plant = new ThermalEvaporationPlant(h, heatSource === 'solar' ? panels : 0);

      let temp: number;
      let heatInput: number;

      if (heatSource === 'custom') {
        heatInput = heat;
        temp = plant.getSteadyStateTempFromHeat(heat);
      } else {
        heatInput = plant.getHeatInput();
        temp = plant.getSteadyStateTemp();
      }

      const heatDissipation = plant.getHeatDissipation(temp);
      const productionRate = this.rateForHeight(temp, h);
      const inputCapacity = plant.getInputCapacity();

      const heightTable: HeightRow[] = [];
      for (let ht = ThermalEvaporationPlant.MIN_HEIGHT; ht <= ThermalEvaporationPlant.MAX_HEIGHT; ht++) {
        heightTable.push({
          height: ht,
          rate: this.rateForHeight(temp, ht),
        });
      }

      this.result.set({
        temp,
        productionRate,
        inputCapacity,
        heatInput,
        heatDissipation,
        heightTable,
      });
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : 'Unable to compute evaporation plan.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }

  /**
   * Compute the production rate for a given steady-state temperature and height.
   * Uses the same formulas as ThermalEvaporationPlant but allows an arbitrary
   * temperature so the height-optimization table can share one temp across all rows.
   */
  private rateForHeight(temp: number, height: number): number {
    const effectiveTemp = Math.min(ThermalEvaporationPlant.MAX_MULTIPLIER_TEMP, temp);
    const tempDelta = effectiveTemp - ThermalEvaporationPlant.AMBIENT_TEMP;
    if (tempDelta <= 0) {
      return 0;
    }

    const multiplier =
      tempDelta * EVAP_PLANT.TEMP_MULTIPLIER * (height / ThermalEvaporationPlant.MAX_HEIGHT);

    if (multiplier >= 1) {
      return Math.floor(multiplier);
    }
    if (multiplier > 0) {
      return 1 / Math.ceil(1 / multiplier);
    }
    return 0;
  }
}
