import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FissionReactor } from '../../../../models/FissionReactor';
import {
  BoilerSupportPlan,
  TurbineSupportPlan,
  computeSodiumCoolingRequirements,
  computeWaterCoolingRequirements,
} from '../../../../utils/cooling-requirements';
import { BOILER } from '../../../../models/constants';
import { ThermoelectricBoiler } from '../../../../models/ThermoelectricBoiler';
import { selectTurbineDimensions, selectBoilerDimensions } from '../../../../utils/dimension-search';
import { TurbineVisualizer } from '../turbine-visualizer/turbine-visualizer';
import { BoilerVisualizer } from '../boiler-visualizer/boiler-visualizer';
import { PerformanceCard } from '../performance-card/performance-card';
import { ConstructionSummary } from '../construction-summary/construction-summary';

interface PlannerInputs {
  width: number;
  length: number;
  height: number;
  coolingMode: 'water' | 'sodium';
  includeBoiler: boolean;
  burnRate: number | null;
}

interface PlannerResult {
  burnRate: number;
  safeBurnRate: number;
  powerPerTick: number;
  steamDemand: number;
  waterDemand: number;
  heatDemand: number;
  turbines: TurbineSupportPlan;
  boiler?: BoilerSupportPlan & { requiredHeat?: number };
  construction: ReturnType<FissionReactor['getConstructionSummary']>;
}

const DEFAULT_REACTOR: PlannerInputs = {
  width: 10,
  length: 10,
  height: 12,
  coolingMode: 'water',
  includeBoiler: false,
  burnRate: null,
};

const HEAT_TO_STEAM_RATIO =
  ThermoelectricBoiler.STEAM_PER_SUPERHEATER / BOILER.SUPERHEATING_HEAT_TRANSFER;

@Component({
  selector: 'app-fission-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TurbineVisualizer, BoilerVisualizer, PerformanceCard, ConstructionSummary],
  templateUrl: './fission-planner.html',
  styleUrl: './fission-planner.css',
})
export class FissionPlanner {
  private readonly fb = new FormBuilder();

  public readonly maxBurnRate = signal<number>(0);

  public readonly form = this.fb.nonNullable.group({
    width: [
      DEFAULT_REACTOR.width,
      [
        Validators.required,
        Validators.min(FissionReactor.MIN_WIDTH),
        Validators.max(FissionReactor.MAX_WIDTH),
      ],
    ],
    length: [
      DEFAULT_REACTOR.length,
      [
        Validators.required,
        Validators.min(FissionReactor.MIN_LENGTH),
        Validators.max(FissionReactor.MAX_LENGTH),
      ],
    ],
    height: [
      DEFAULT_REACTOR.height,
      [
        Validators.required,
        Validators.min(FissionReactor.MIN_HEIGHT),
        Validators.max(FissionReactor.MAX_HEIGHT),
      ],
    ],
    coolingMode: [DEFAULT_REACTOR.coolingMode as PlannerInputs['coolingMode']],
    includeBoiler: [DEFAULT_REACTOR.includeBoiler],
    burnRate: [DEFAULT_REACTOR.burnRate],
  });

  public readonly error = signal<string | null>(null);
  public readonly result = signal<PlannerResult | null>(null);

  constructor() {
    effect(() => {
      const value = this.form.getRawValue();
      if (this.form.valid) {
        this.recomputePlan(value);
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
    this.recomputePlan(this.form.getRawValue());
  }

  public describeCount(count: number, singular: string, plural?: string): string {
    const label = count === 1 ? singular : plural ?? `${singular}s`;
    return `${this.asNumber(count)} ${label}`;
  }

  private recomputePlan(inputs: PlannerInputs): void {
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
  this.maxBurnRate.set(reactor.getMaxBurnRate());
      const desiredBurn = inputs.burnRate;
      const maxBurn = reactor.getMaxBurnRate();
      const normalisedBurn =
        desiredBurn !== null && Number.isFinite(desiredBurn) && desiredBurn > 0
          ? Math.min(desiredBurn, maxBurn)
          : maxBurn;
      const burnRate = normalisedBurn;
      const construction = reactor.getConstructionSummary();
      if (coolingMode === 'water') {
  const hotCoolant = reactor.getHotCoolantPerTick(burnRate, 'water');
        const steamDemand = hotCoolant;
        const waterDemand = hotCoolant;
        const heatRequirement = steamDemand / HEAT_TO_STEAM_RATIO;
        const turbineDimensions = selectTurbineDimensions(steamDemand, waterDemand);
        const boilerDimensions = includeBoiler
          ? selectBoilerDimensions(heatRequirement, steamDemand)
          : undefined;
        const plan = computeWaterCoolingRequirements(burnRate, turbineDimensions, boilerDimensions);
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
          waterDemand: plan.waterDemand,
          heatDemand: plan.boiler?.requiredHeat ?? heatRequirement,
          turbines: plan.turbine,
          boiler: plan.boiler,
          construction,
        });
      } else {
  const hotCoolant = reactor.getHotCoolantPerTick(burnRate, 'sodium');
        const steamDemand = hotCoolant;
        const heatDemand = steamDemand / HEAT_TO_STEAM_RATIO;
        const turbineDimensions = selectTurbineDimensions(steamDemand, steamDemand);
        const boilerDimensions = selectBoilerDimensions(heatDemand, steamDemand);
        const plan = computeSodiumCoolingRequirements(
          burnRate,
          turbineDimensions,
          boilerDimensions
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
          powerPerTick: plan.turbine.count * plan.turbine.perUnitPower,
          steamDemand: plan.steamDemand,
          waterDemand: plan.steamDemand,
          heatDemand: plan.heatDemand,
          turbines: plan.turbine,
          boiler: plan.boiler,
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
    return value.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
}
