import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SPSModel } from '../../../../models/SPS';
import { asDecimal } from '../../../../utils/format';

interface SPSResult {
  antimatterRate: number;
  poloniumDemand: number;
  energyDemand: number;
  inputCapacity: number;
  outputCapacity: number;
}

@Component({
  selector: 'app-sps-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sps-planner.html',
  styleUrl: './sps-planner.css',
})
export class SPSPlanner {
  private readonly fb = new FormBuilder();

  public readonly form = this.fb.nonNullable.group({
    targetRate: [
      0.001,
      [
        Validators.required,
        Validators.min(0.001),
        Validators.max(2),
      ],
    ],
  });

  public readonly result = signal<SPSResult | null>(null);
  public readonly error = signal<string | null>(null);

  constructor() {
    this.computePlan();
  }

  public computePlan(): void {
    try {
      this.error.set(null);
      const { targetRate } = this.form.getRawValue();

      const rate =
        typeof targetRate === 'number'
          ? targetRate
          : Number.parseFloat(targetRate);

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Invalid target antimatter rate.');
      }

      const model = new SPSModel(rate);

      this.result.set({
        antimatterRate: model.targetAntimatterRate,
        poloniumDemand: model.getPoloniumDemand(),
        energyDemand: model.getEnergyDemand(),
        inputCapacity: model.getInputCapacity(),
        outputCapacity: model.getOutputCapacity(),
      });
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : 'Unable to compute SPS plan.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }

  public formatEnergy(joulesPerTick: number): string {
    if (joulesPerTick >= 1_000_000_000) {
      return asDecimal(joulesPerTick / 1_000_000_000, 2) + ' GJ/t';
    }
    if (joulesPerTick >= 1_000_000) {
      return asDecimal(joulesPerTick / 1_000_000, 2) + ' MJ/t';
    }
    if (joulesPerTick >= 1_000) {
      return asDecimal(joulesPerTick / 1_000, 2) + ' kJ/t';
    }
    return asDecimal(joulesPerTick, 2) + ' J/t';
  }
}
