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
    energyUpgrades: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(8),
      ],
    ],
  });

  public readonly result = signal<ProductionChainResult | null>(null);
  public readonly error = signal<string | null>(null);
  public readonly rateUnit = signal<'tick' | 'second' | 'minute'>('tick');
  public readonly showEnergyInfo = signal(false);

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

  public toggleEnergyInfo(): void {
    this.showEnergyInfo.update(v => !v);
  }

  public setRateUnit(unit: 'tick' | 'second' | 'minute'): void {
    this.rateUnit.set(unit);
  }

  public formatRate(perTick: number, unit: string): string {
    const u = this.rateUnit();
    if (u === 'second') {
      return asDecimal(perTick * 20, 2) + ' ' + unit + '/s';
    }
    if (u === 'minute') {
      return asDecimal(perTick * 1200, 2) + ' ' + unit + '/min';
    }
    return asDecimal(perTick, 2) + ' ' + unit + '/t';
  }

  public formatItemRate(rate: number): string {
    const perSecond = rate * 20;
    if (perSecond < 0.01) {
      const perMinute = rate * 1200;
      return asDecimal(perMinute, 2) + ' items/min';
    }
    if (rate < 0.01) {
      return asDecimal(perSecond, 2) + ' items/s';
    }
    return asDecimal(rate, 2) + ' items/t';
  }

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
      const { fuelRate, speedUpgrades, energyUpgrades } = this.form.getRawValue();

      const rate =
        typeof fuelRate === 'number' ? fuelRate : Number.parseFloat(fuelRate);
      const speed =
        typeof speedUpgrades === 'number'
          ? speedUpgrades
          : Number.parseInt(speedUpgrades, 10);
      const energy =
        typeof energyUpgrades === 'number'
          ? energyUpgrades
          : Number.parseInt(energyUpgrades, 10);

      if (!Number.isFinite(rate)) {
        throw new Error('Invalid fuel rate supplied.');
      }
      if (!Number.isFinite(speed)) {
        throw new Error('Invalid speed upgrades value supplied.');
      }

      const chain = new FissileProductionChain(rate, speed, energy);
      this.result.set(chain.calculate());
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : 'Unable to compute production chain.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }
}
