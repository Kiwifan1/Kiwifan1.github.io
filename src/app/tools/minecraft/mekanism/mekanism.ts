import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  POWER_OPTIMIZATION_DEFAULTS,
  PowerOptimizationOverrides,
  CoolingMode,
  BoilerPlan,
  planBoiler,
  listTurbineDesigns,
} from '../../../utils/power-optimization';
import { calculateFissionReactorCost, FissionReactorCost } from '../../../utils/fission-reactor-cost';
import { IndustrialTurbineCost } from '../../../utils/industrial-turbine-cost';

interface PlannerSummary {
  reactor: {
    cost: FissionReactorCost;
    burnRate: number;
    maxBurnRate: number;
    coolantPerTick: number;
    steamPerTick: number;
  };
  turbines: {
    design: IndustrialTurbineCost;
    count: number;
    steamPerUnit: number;
    utilisation: number;
    powerPerUnit: number;
    totalPower: number;
    condensersPerUnit: number;
    condensersTotal: number;
    mechanicalPipesPerUnit: number;
    mechanicalPipesTotal: number;
    pressurisedPipesPerUnit: number;
    pressurisedPipesTotal: number;
  };
  boiler?: {
    plan: BoilerPlan;
    count: number;
    steamPerUnit: number;
    hotCoolantPerUnit: number;
  };
  cooling: CoolingMode;
  overrides: Required<PowerOptimizationOverrides>;
}

@Component({
  selector: 'app-mekanism-planner',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './mekanism.html',
  styleUrl: './mekanism.css',
})
export class MekanismPlanner {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly turbineDesigns = listTurbineDesigns();

  readonly configForm = this.fb.nonNullable.group({
    steamPerFuel: [
      POWER_OPTIMIZATION_DEFAULTS.steamPerFuel,
      [Validators.required, Validators.min(1)],
    ],
    waterCoolantRate: [
      POWER_OPTIMIZATION_DEFAULTS.waterCoolantRate,
      [Validators.required, Validators.min(1)],
    ],
    sodiumCoolantRate: [
      POWER_OPTIMIZATION_DEFAULTS.sodiumCoolantRate,
      [Validators.required, Validators.min(1)],
    ],
    boilCapacityPerSuperheater: [
      POWER_OPTIMIZATION_DEFAULTS.boilCapacityPerSuperheater,
      [Validators.required, Validators.min(1)],
    ],
    steamCapacityPerBlock: [
      POWER_OPTIMIZATION_DEFAULTS.steamCapacityPerBlock,
      [Validators.required, Validators.min(1)],
    ],
    hotCoolantCapacityPerBlock: [
      POWER_OPTIMIZATION_DEFAULTS.hotCoolantCapacityPerBlock,
      [Validators.required, Validators.min(1)],
    ],
    waterCapacityPerBlock: [
      POWER_OPTIMIZATION_DEFAULTS.waterCapacityPerBlock,
      [Validators.required, Validators.min(1)],
    ],
    defaultReactorPorts: [
      POWER_OPTIMIZATION_DEFAULTS.defaultReactorPorts,
      [Validators.required, Validators.min(0)],
    ],
    defaultBoilerValves: [
      POWER_OPTIMIZATION_DEFAULTS.defaultBoilerValves,
      [Validators.required, Validators.min(0)],
    ],
    mechanicalPipeRate: [
      POWER_OPTIMIZATION_DEFAULTS.mechanicalPipeRate,
      [Validators.required, Validators.min(1)],
    ],
    pressurizedPipeRate: [
      POWER_OPTIMIZATION_DEFAULTS.pressurizedPipeRate,
      [Validators.required, Validators.min(1)],
    ],
  });

  readonly reactorForm = this.fb.nonNullable.group({
    width: [18, [Validators.required, Validators.min(3), Validators.max(18)]],
    height: [18, [Validators.required, Validators.min(4), Validators.max(18)]],
    length: [18, [Validators.required, Validators.min(3), Validators.max(18)]],
    burnRate: [1_000, [Validators.required, Validators.min(1)]],
  });

  readonly operationForm = this.fb.nonNullable.group({
    cooling: ['water' as CoolingMode, Validators.required],
    useBoiler: [false],
  });

  readonly maxBurnRate = signal(this.computeMaxBurnRate());

  readonly result = signal<PlannerSummary | null>(null);
  readonly error = signal<string | null>(null);
  readonly lastOverrides = signal<Required<PowerOptimizationOverrides>>({
    ...POWER_OPTIMIZATION_DEFAULTS,
  });

  constructor() {
    this.reactorForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncBurnRate());
  }

  runPlanner(): void {
    if (this.configForm.invalid || this.reactorForm.invalid || this.operationForm.invalid) {
      this.configForm.markAllAsTouched();
      this.reactorForm.markAllAsTouched();
      this.operationForm.markAllAsTouched();
      return;
    }

    const overrides = this.buildOverrides();
    const { width, height, length, burnRate } = this.reactorForm.getRawValue();
    const reactorCost = calculateFissionReactorCost({
      width,
      height,
      length,
      ports: overrides.defaultReactorPorts,
    });

    const maxBurn = reactorCost.fissileFuelAssemblies;
    const clampedBurn = Math.min(Math.max(burnRate, 1), maxBurn);
    if (clampedBurn !== burnRate) {
      this.reactorForm.patchValue({ burnRate: clampedBurn }, { emitEvent: false });
    }

    const cooling = this.operationForm.controls.cooling.value;
    const useBoiler = this.operationForm.controls.useBoiler.value;

    try {
      const summary = this.computeSummary({
        reactorCost,
        burnRate: clampedBurn,
        cooling,
        useBoiler,
        overrides,
      });
      this.result.set(summary);
      this.error.set(null);
      this.lastOverrides.set(overrides);
    } catch (err) {
      this.result.set(null);
      this.error.set((err as Error).message ?? 'Failed to create a plan');
    }
  }

  resetConfig(): void {
    this.configForm.reset({ ...POWER_OPTIMIZATION_DEFAULTS });
  }

  private computeSummary(params: {
    reactorCost: FissionReactorCost;
    burnRate: number;
    cooling: CoolingMode;
    useBoiler: boolean;
    overrides: Required<PowerOptimizationOverrides>;
  }): PlannerSummary {
    const { reactorCost, burnRate, cooling, useBoiler, overrides } = params;
    if (burnRate <= 0) {
      throw new Error('Burn rate must be greater than zero');
    }

    const steamPerTick = burnRate * overrides.steamPerFuel;
    const coolantPerTick =
      burnRate * (cooling === 'sodium' ? overrides.sodiumCoolantRate : overrides.waterCoolantRate);

    const design = this.pickTurbineForSteam(steamPerTick);
    const turbineCount = Math.max(1, Math.ceil(steamPerTick / design.performance.maxSteamFlow));
    const steamPerUnit = steamPerTick / turbineCount;
    const utilisation = steamPerUnit / design.performance.maxSteamFlow;
    const powerPerUnit = steamPerUnit * 10 * design.performance.bladeEfficiency;
    const totalPower = powerPerUnit * turbineCount;

    const condensersPerUnit = design.condensersWithWaterReclamation.condensers;
    const condensersTotal = condensersPerUnit * turbineCount;

    const mechanicalPipesPerUnit = Math.max(
      1,
      Math.ceil(
        design.condensersWithWaterReclamation.waterThroughput / overrides.mechanicalPipeRate
      )
    );
    const mechanicalPipesTotal = mechanicalPipesPerUnit * turbineCount;

    const pressurisedPipesPerUnit = Math.max(
      1,
      Math.ceil(design.performance.maxSteamFlow / overrides.pressurizedPipeRate)
    );
    const pressurisedPipesTotal = pressurisedPipesPerUnit * turbineCount;

    let boiler: PlannerSummary['boiler'];
    const needsBoiler = cooling === 'sodium' || useBoiler;
    if (needsBoiler) {
      const plan = planBoiler(
        {
          steam: steamPerTick,
          hotCoolant: cooling === 'sodium' ? coolantPerTick : 0,
        },
        {
          boilCapacityPerSuperheater: overrides.boilCapacityPerSuperheater,
          steamCapacityPerBlock: overrides.steamCapacityPerBlock,
          waterCapacityPerBlock: overrides.waterCapacityPerBlock,
          hotCoolantCapacityPerBlock: overrides.hotCoolantCapacityPerBlock,
          defaultBoilerValves: overrides.defaultBoilerValves,
        }
      );
      const boilerCount = Math.max(1, Math.ceil(steamPerTick / plan.boilCapacity));
      boiler = {
        plan,
        count: boilerCount,
        steamPerUnit: steamPerTick / boilerCount,
        hotCoolantPerUnit: (cooling === 'sodium' ? coolantPerTick : 0) / boilerCount,
      };
    }

    return {
      reactor: {
        cost: reactorCost,
        burnRate,
        maxBurnRate: reactorCost.fissileFuelAssemblies,
        coolantPerTick,
        steamPerTick,
      },
      turbines: {
        design,
        count: turbineCount,
        steamPerUnit,
        utilisation,
        powerPerUnit,
        totalPower,
        condensersPerUnit,
        condensersTotal,
        mechanicalPipesPerUnit,
        mechanicalPipesTotal,
        pressurisedPipesPerUnit,
        pressurisedPipesTotal,
      },
      boiler,
      cooling,
      overrides,
    };
  }

  private pickTurbineForSteam(steam: number): IndustrialTurbineCost {
    let candidate: IndustrialTurbineCost | null = null;
    for (const design of this.turbineDesigns) {
      if (design.performance.maxSteamFlow + 1e-6 < steam) {
        continue;
      }
      if (!candidate) {
        candidate = design;
        continue;
      }
      const currentSteam = design.performance.maxSteamFlow;
      const bestSteam = candidate.performance.maxSteamFlow;
      if (currentSteam < bestSteam - 1e-6) {
        candidate = design;
        continue;
      }
      if (Math.abs(currentSteam - bestSteam) < 1e-6) {
        if (design.shell.totalShell < candidate.shell.totalShell) {
          candidate = design;
        }
      }
    }

    if (candidate) {
      return candidate;
    }

    let fallback = this.turbineDesigns[0];
    for (let i = 1; i < this.turbineDesigns.length; i += 1) {
      if (
        this.turbineDesigns[i].performance.maxSteamFlow >
        fallback.performance.maxSteamFlow
      ) {
        fallback = this.turbineDesigns[i];
      }
    }
    return fallback;
  }

  private buildOverrides(): Required<PowerOptimizationOverrides> {
    const values = this.configForm.getRawValue();
    return {
      steamPerFuel: values.steamPerFuel,
      waterCoolantRate: values.waterCoolantRate,
      sodiumCoolantRate: values.sodiumCoolantRate,
      boilCapacityPerSuperheater: values.boilCapacityPerSuperheater,
      steamCapacityPerBlock: values.steamCapacityPerBlock,
      hotCoolantCapacityPerBlock: values.hotCoolantCapacityPerBlock,
      waterCapacityPerBlock: values.waterCapacityPerBlock,
      defaultReactorPorts: values.defaultReactorPorts,
      defaultBoilerValves: values.defaultBoilerValves,
      mechanicalPipeRate: values.mechanicalPipeRate,
      pressurizedPipeRate: values.pressurizedPipeRate,
    };
  }

  private computeMaxBurnRate(): number {
    const { width, height, length } = this.reactorForm.getRawValue();
    return calculateFissionReactorCost({ width, height, length, ports: 0 }).fissileFuelAssemblies;
  }

  private syncBurnRate(): void {
    const maxRate = this.computeMaxBurnRate();
    this.maxBurnRate.set(maxRate);
    const burnControl = this.reactorForm.controls.burnRate;
    if (burnControl.value > maxRate) {
      burnControl.patchValue(maxRate, { emitEvent: false });
    }
  }
}
