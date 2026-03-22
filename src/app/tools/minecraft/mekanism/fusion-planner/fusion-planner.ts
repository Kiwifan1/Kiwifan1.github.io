import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FusionReactorModel } from '../../../../models/FusionReactorModel';
import { asNumber, asDecimal } from '../../../../utils/format';

@Component({
  selector: 'app-fusion-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fusion-planner.html',
  styleUrl: './fusion-planner.css',
})
export class FusionPlanner {
  private readonly fb = new FormBuilder();

  public readonly form = this.fb.nonNullable.group({
    injectionRate: [
      2,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(FusionReactorModel.MAX_INJECTION),
      ],
    ],
    coolingMode: ['passive' as 'passive' | 'active'],
  });

  public readonly result = signal<FusionReactorModel | null>(null);
  public readonly error = signal<string | null>(null);

  public readonly asNumber = asNumber;
  public readonly asDecimal = asDecimal;

  public formatEnergy(joulesPerTick: number): string {
    if (joulesPerTick >= 1_000_000) {
      return asDecimal(joulesPerTick / 1_000_000, 2) + ' MJ/t';
    }
    if (joulesPerTick >= 1_000) {
      return asDecimal(joulesPerTick / 1_000, 2) + ' kJ/t';
    }
    return asDecimal(joulesPerTick, 2) + ' J/t';
  }

  constructor() {
    effect(() => {
      const value = this.form.getRawValue();
      if (this.form.valid) {
        this.computePlan();
      } else {
        this.error.set(null);
        this.result.set(null);
      }
    });
  }

  public computePlan(): void {
    try {
      this.error.set(null);
      const { injectionRate, coolingMode } = this.form.getRawValue();

      const rate =
        typeof injectionRate === 'number'
          ? injectionRate
          : Number.parseInt(injectionRate, 10);

      if (!Number.isFinite(rate)) {
        throw new Error('Invalid injection rate supplied.');
      }

      const reactor = new FusionReactorModel(rate, coolingMode);
      this.result.set(reactor);
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : 'Unable to compute fusion plan.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }
}
