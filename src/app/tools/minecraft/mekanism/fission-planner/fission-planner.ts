import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FissionReactor } from '../../../../models/FissionReactor';
import {
  BoilerDimensions,
  BoilerSupportPlan,
  TurbineDimensions,
  TurbineSupportPlan,
  computeSodiumCoolingRequirements,
  computeWaterCoolingRequirements,
} from '../../../../utils/cooling-requirements';
import { BOILER } from '../../../../models/constants';
import { IndustrialTurbine } from '../../../../models/IndustrialTurbine';
import { PowerOptimization } from '../../../../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../../../../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization } from '../../../../models/ThermoelectricBoilerOptimization';
import { StructureVisualizer } from '../structure-visualizer/structure-visualizer';

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
  imports: [CommonModule, ReactiveFormsModule, StructureVisualizer],
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

function selectTurbineDimensions(steamDemand: number, waterDemand: number): TurbineDimensions {
  const fallback: TurbineDimensions = {
    length: IndustrialTurbine.MIN_LENGTH,
    height: IndustrialTurbine.MIN_HEIGHT,
  };

  if (steamDemand <= 0 && waterDemand <= 0) {
    return fallback;
  }

  let best: { score: number[]; dims: TurbineDimensions } | null = null;

  for (
    let length = IndustrialTurbine.MIN_LENGTH;
    length <= IndustrialTurbine.MAX_LENGTH;
    length += 1
  ) {
    if (length % 2 === 0) {
      continue;
    }
    const maxHeight = Math.min(IndustrialTurbine.MAX_HEIGHT, 2 * length - 1);
    let foundOptimalForLength = false;
    for (let height = IndustrialTurbine.MIN_HEIGHT; height <= maxHeight; height += 1) {
      let evaluation;
      try {
        evaluation = PowerOptimization.findOptimalDesign(length, height);
      } catch (err) {
        void err;
        continue;
      }

      const metrics = evaluation.optimal;
      if (metrics.effectiveSteamFlow <= 0 || metrics.waterFlow <= 0) {
        continue;
      }

      const steamUnits = steamDemand > 0 ? Math.ceil(steamDemand / metrics.effectiveSteamFlow) : 0;
      const waterUnits = waterDemand > 0 ? Math.ceil(waterDemand / metrics.waterFlow) : 0;
      const count = Math.max(steamUnits, waterUnits, 1);
      const area = length * length;
      const score = [count, area, height];
      if (!best || compareScores(score, best.score) < 0) {
        best = { score, dims: { length, height } };
      }

      if (count === 1) {
        foundOptimalForLength = true;
        break;
      }
    }

    if (foundOptimalForLength && best?.dims.length === length) {
      break;
    }
  }

  return best?.dims ?? fallback;
}

function selectBoilerDimensions(heatDemand: number, steamDemand: number): BoilerDimensions {
  const fallback: BoilerDimensions = {
    width: ThermoelectricBoiler.MIN_WIDTH,
    length: ThermoelectricBoiler.MIN_LENGTH,
    height: ThermoelectricBoiler.MIN_HEIGHT,
  };

  if (heatDemand <= 0 && steamDemand <= 0) {
    return fallback;
  }

  let best: { score: number[]; dims: BoilerDimensions } | null = null;

  for (
    let width = ThermoelectricBoiler.MIN_WIDTH;
    width <= ThermoelectricBoiler.MAX_WIDTH;
    width += 1
  ) {
    for (let length = width; length <= ThermoelectricBoiler.MAX_LENGTH; length += 1) {
      const area = width * length;

      for (
        let height = ThermoelectricBoiler.MIN_HEIGHT;
        height <= ThermoelectricBoiler.MAX_HEIGHT;
        height += 1
      ) {
        let optimal;
        try {
          optimal = ThermoelectricBoilerOptimization.findOptimalConfiguration(
            width,
            length,
            height
          ).optimal;
        } catch (err) {
          void err;
          continue;
        }

        const perBoilerSteam = optimal.production.limit;
        if (perBoilerSteam <= 0) {
          continue;
        }

        const perBoilerHeat = Math.min(
          optimal.superheaters * BOILER.SUPERHEATING_HEAT_TRANSFER,
          perBoilerSteam / HEAT_TO_STEAM_RATIO
        );
        if (perBoilerHeat <= 0) {
          continue;
        }

        const steamUnits = steamDemand > 0 ? Math.ceil(steamDemand / perBoilerSteam) : 0;
        const heatUnits = heatDemand > 0 ? Math.ceil(heatDemand / perBoilerHeat) : 0;
        const count = Math.max(steamUnits, heatUnits, 1);
        const aspectDelta = Math.abs(length - width);
        const score = [count, aspectDelta, area, height];

        if (!best || compareScores(score, best.score) < 0) {
          best = { score, dims: { width, length, height } };
        }

        if (count === 1 && aspectDelta === 0) {
          break;
        }
      }
    }
  }

  return best?.dims ?? fallback;
}

function compareScores(a: number[], b: number[]): number {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i += 1) {
    const delta = a[i] - b[i];
    if (delta !== 0) {
      return delta;
    }
  }
  return a.length - b.length;
}
