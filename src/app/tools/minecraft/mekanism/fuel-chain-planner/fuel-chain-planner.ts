import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FissileProductionChain,
  ProductionChainResult,
} from '../../../../models/FissileProductionChain';
import { ChainFlow } from '../chain-flow/chain-flow';
import { asNumber, asDecimal } from '../../../../utils/format';

@Component({
  selector: 'app-fuel-chain-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChainFlow],
  templateUrl: './fuel-chain-planner.html',
  styleUrl: './fuel-chain-planner.css',
})
export class FuelChainPlanner {
  private readonly fb = new FormBuilder();

  public readonly form = this.fb.nonNullable.group({
    fuelRate: [
      288,
      [
        Validators.required,
        Validators.min(FissileProductionChain.MIN_FUEL_RATE),
        Validators.max(FissileProductionChain.MAX_FUEL_RATE),
      ],
    ],
    speedUpgrades: [
      8,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(FissileProductionChain.MAX_SPEED_UPGRADES),
      ],
    ],
  });

  public readonly result = signal<ProductionChainResult | null>(null);
  public readonly error = signal<string | null>(null);

  public readonly asNumber = asNumber;
  public readonly asDecimal = asDecimal;

  constructor() {
    effect(() => {
      const value = this.form.getRawValue();
      if (this.form.valid) {
        this.computeChain();
      } else {
        this.error.set(null);
        this.result.set(null);
      }
    });
  }

  public computeChain(): void {
    try {
      this.error.set(null);
      const { fuelRate, speedUpgrades } = this.form.getRawValue();

      const rate =
        typeof fuelRate === 'number' ? fuelRate : Number.parseFloat(fuelRate);
      const upgrades =
        typeof speedUpgrades === 'number'
          ? speedUpgrades
          : Number.parseInt(speedUpgrades, 10);

      if (!Number.isFinite(rate)) {
        throw new Error('Invalid fuel rate supplied.');
      }
      if (!Number.isFinite(upgrades)) {
        throw new Error('Invalid speed upgrades value supplied.');
      }

      const chain = new FissileProductionChain(rate, upgrades);
      this.result.set(chain.calculate());
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : 'Unable to compute production chain.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }
}
