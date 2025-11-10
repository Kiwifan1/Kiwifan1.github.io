import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FissionReactor } from '../../../../models/FissionReactor';
import { computeSodiumCoolingRequirements, computeWaterCoolingRequirements } from '../../../../utils/cooling-requirements';
import { PowerOptimization } from '../../../../models/TurbinePowerOptimization';
import { HEATING } from '../../../../models/constants';

interface PlannerInputs {
  width: number;
  length: number;
  height: number;
  coolingMode: 'water' | 'sodium';
  includeBoiler: boolean;
}

interface PlannerResult {
  burnRate: number;
  safeBurnRate: number;
  powerPerTick: number;
  steamDemand: number;
  waterDemand: number;
  heatDemand: number;
  turbines: {
    count: number;
    perUnitSteam: number;
    perUnitWater: number;
    perUnitPower: number;
  };
  boiler?: {
    count: number;
    perUnitSteam: number;
    perUnitHeat: number;
    perUnitSuperheaters: number;
    requiredHeat?: number;
  };
  construction: ReturnType<FissionReactor['getConstructionSummary']>;
}

const DEFAULT_REACTOR: PlannerInputs = {
  width: 10,
  length: 10,
  height: 12,
  coolingMode: 'water',
  includeBoiler: false,
};

const DEFAULT_TURBINE = { length: 17, height: 18 } as const;
const DEFAULT_BOILER = { width: 18, length: 18, height: 18 } as const;

@Component({
  selector: 'app-fission-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fission-planner.html',
  styleUrl: './fission-planner.css',
})
export class FissionPlanner {
  private readonly fb = new FormBuilder();

  public readonly form = this.fb.nonNullable.group({
    width: [DEFAULT_REACTOR.width, [Validators.required, Validators.min(FissionReactor.MIN_WIDTH), Validators.max(FissionReactor.MAX_WIDTH)]],
    length: [DEFAULT_REACTOR.length, [Validators.required, Validators.min(FissionReactor.MIN_LENGTH), Validators.max(FissionReactor.MAX_LENGTH)]],
    height: [DEFAULT_REACTOR.height, [Validators.required, Validators.min(FissionReactor.MIN_HEIGHT), Validators.max(FissionReactor.MAX_HEIGHT)]],
    coolingMode: [DEFAULT_REACTOR.coolingMode as PlannerInputs['coolingMode']],
    includeBoiler: [DEFAULT_REACTOR.includeBoiler],
  });

  public readonly error = signal<string | null>(null);
  public readonly result = signal<PlannerResult | null>(null);

  private readonly turbineProfile = computed(() => PowerOptimization.findOptimalDesign(DEFAULT_TURBINE.length, DEFAULT_TURBINE.height).optimal);

  constructor() {
    effect(() => {
      const value = this.form.getRawValue();
      if (this.form.valid) {
        this.updateResult(value);
      } else {
        this.error.set(null);
        this.result.set(null);
      }
    });
  }

  public toggleCooling(mode: PlannerInputs['coolingMode']): void {
    this.form.patchValue({ coolingMode: mode }, { emitEvent: true });
    if (mode === 'sodium') {
      this.form.patchValue({ includeBoiler: true });
    }
  }

  public computePlan(): void {
    this.updateResult(this.form.getRawValue());
  }

  public describeCount(count: number, singular: string, plural?: string): string {
    const label = count === 1 ? singular : plural ?? `${singular}s`;
    return `${this.asNumber(count)} ${label}`;
  }

  private updateResult(inputs: PlannerInputs): void {
    try {
      this.error.set(null);
      const { width, length, height, coolingMode, includeBoiler } = inputs;
      const normalise = (value: number | string, label: string): number => {
        const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
        if (!Number.isFinite(numeric)) {
          throw new Error(`Invalid ${label} supplied.`);
        }
        return numeric;
      };

      const reactorWidth = normalise(width, 'width');
      const reactorLength = normalise(length, 'length');
      const reactorHeight = normalise(height, 'height');
      const reactor = new FissionReactor(reactorWidth, reactorHeight, reactorLength, coolingMode);
      const burnRate = reactor.getMaxBurnRate();
      const construction = reactor.getConstructionSummary();
      const turbine = this.turbineProfile();

      if (coolingMode === 'water') {
        const plan = computeWaterCoolingRequirements(
          burnRate,
          DEFAULT_TURBINE,
          includeBoiler ? DEFAULT_BOILER : undefined
        );
        const turbineFlow = plan.turbine.count * plan.turbine.perUnitSteam;
        const waterReturn = plan.turbine.count * plan.turbine.perUnitWater;
        const safeBurn = reactor.analyseBurnRate(burnRate, {
          steamFlow: turbineFlow,
          waterReturn,
        }).achievable;

        this.result.set({
          burnRate,
          safeBurnRate: safeBurn,
          powerPerTick: plan.turbine.count * turbine.powerPerTick,
          steamDemand: plan.steamDemand,
          waterDemand: plan.waterDemand,
          heatDemand: plan.boiler?.requiredHeat ?? burnRate * HEATING.WATER,
          turbines: {
            count: plan.turbine.count,
            perUnitSteam: plan.turbine.perUnitSteam,
            perUnitWater: plan.turbine.perUnitWater,
            perUnitPower: plan.turbine.perUnitPower,
          },
          boiler: plan.boiler
            ? {
                count: plan.boiler.count,
                perUnitSteam: plan.boiler.perUnitSteam,
                perUnitHeat: plan.boiler.perUnitHeat,
                perUnitSuperheaters: plan.boiler.perUnitSuperheaters,
                requiredHeat: plan.boiler.requiredHeat,
              }
            : undefined,
          construction,
        });
      } else {
        const plan = computeSodiumCoolingRequirements(burnRate, DEFAULT_TURBINE, DEFAULT_BOILER);
        const turbineFlow = plan.turbine.count * plan.turbine.perUnitSteam;
        const waterReturn = plan.turbine.count * plan.turbine.perUnitWater;
        const safeBurn = reactor.analyseBurnRate(burnRate, {
          steamFlow: turbineFlow,
          waterReturn,
        }).achievable;

        this.result.set({
          burnRate,
          safeBurnRate: safeBurn,
          powerPerTick: plan.turbine.count * plan.turbine.perUnitPower,
          steamDemand: plan.steamDemand,
          waterDemand: plan.steamDemand,
          heatDemand: plan.heatDemand,
          turbines: {
            count: plan.turbine.count,
            perUnitSteam: plan.turbine.perUnitSteam,
            perUnitWater: plan.turbine.perUnitWater,
            perUnitPower: plan.turbine.perUnitPower,
          },
          boiler: {
            count: plan.boiler.count,
            perUnitSteam: plan.boiler.perUnitSteam,
            perUnitHeat: plan.boiler.perUnitHeat,
            perUnitSuperheaters: plan.boiler.perUnitSuperheaters,
          },
          construction,
        });
      }
    } catch (err) {
      const fallback = err instanceof Error ? err.message : 'Unable to compute configuration.';
      this.error.set(fallback);
      this.result.set(null);
    }
  }

  public toggleBoiler(value: boolean): void {
    this.form.patchValue({ includeBoiler: value }, { emitEvent: true });
  }

  public asNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  public asDecimal(value: number, digits: number = 2): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
}
