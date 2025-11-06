import {
  calculateFissionReactorCost,
  FissionReactorCost,
} from './fission-reactor-cost';
import {
  calculateIndustrialTurbineCost,
  IndustrialTurbineCost,
  IndustrialTurbineWaterReclamation,
  STEAM_PIPE_RATE,
  WATER_PIPE_RATE,
} from './industrial-turbine-cost';
import { computeShellBreakdown, ShellBreakdown } from './structure-shell';

interface TurbineCandidate {
  turbine: IndustrialTurbineCost;
  requiredSteam: number;
  utilisation: number;
}

export interface BoilerPlan {
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
  shell: ShellBreakdown;
  valves: number;
  waterCavityHeight: number;
  steamCavityHeight: number;
  pressureDispersers: number;
  superheatingElements: number;
  boilCapacity: number;
  steamCapacity: number;
  waterCapacity: number;
  hotCoolantCapacity: number;
}

export interface BoilerTuning {
  boilCapacityPerSuperheater: number;
  steamCapacityPerBlock: number;
  waterCapacityPerBlock: number;
  hotCoolantCapacityPerBlock: number;
  defaultBoilerValves: number;
}

export type CoolingMode = 'water' | 'sodium';

export interface PowerOptimizationOverrides {
  steamPerFuel?: number;
  waterCoolantRate?: number;
  sodiumCoolantRate?: number;
  boilCapacityPerSuperheater?: number;
  steamCapacityPerBlock?: number;
  hotCoolantCapacityPerBlock?: number;
  waterCapacityPerBlock?: number;
  defaultReactorPorts?: number;
  defaultBoilerValves?: number;
  mechanicalPipeRate?: number;
  pressurizedPipeRate?: number;
}

export interface PowerOptimizationOptions {
  targetPower: number;
  cooling: CoolingMode;
  useBoiler?: boolean;
  reclaimWater?: boolean;
  minTurbineSize?: number;
  maxTurbineSize?: number;
  overrides?: PowerOptimizationOverrides;
}

export interface PowerOptimizationResult {
  targetPower: number;
  turbine: IndustrialTurbineCost;
  turbineOperation: {
    requiredSteam: number;
    utilisation: number;
    headroom: number;
  };
  reactor: {
    burnRate: number;
    coolantPerTick: number;
    capacity: number;
    cost: FissionReactorCost;
  };
  boiler?: BoilerPlan;
  waterReclamation: IndustrialTurbineWaterReclamation;
}

export const MIN_TURBINE_SIZE = 5;
export const MAX_TURBINE_SIZE = 17;
export const MIN_TURBINE_HEIGHT = 5;
export const MAX_TURBINE_HEIGHT = 18;
const WATER_COOLANT_RATE = 20_000;
const SODIUM_COOLANT_RATE = 200_000;
const STEAM_PER_FUEL = 20_000;
const BOIL_CAPACITY_PER_SUPERHEATER = 320_000;
const STEAM_CAPACITY_PER_BLOCK = 160_000;
const HOT_COOLANT_CAPACITY_PER_BLOCK = 256_000;
const WATER_CAPACITY_PER_BLOCK = 16_000;
const DEFAULT_REACTOR_PORTS = 4;
const DEFAULT_BOILER_VALVES = 4;
const DEFAULT_MECHANICAL_PIPE_RATE = WATER_PIPE_RATE;
const DEFAULT_PRESSURISED_PIPE_RATE = STEAM_PIPE_RATE;

export const POWER_OPTIMIZATION_DEFAULTS: Required<PowerOptimizationOverrides> = {
  steamPerFuel: STEAM_PER_FUEL,
  waterCoolantRate: WATER_COOLANT_RATE,
  sodiumCoolantRate: SODIUM_COOLANT_RATE,
  boilCapacityPerSuperheater: BOIL_CAPACITY_PER_SUPERHEATER,
  steamCapacityPerBlock: STEAM_CAPACITY_PER_BLOCK,
  hotCoolantCapacityPerBlock: HOT_COOLANT_CAPACITY_PER_BLOCK,
  waterCapacityPerBlock: WATER_CAPACITY_PER_BLOCK,
  defaultReactorPorts: DEFAULT_REACTOR_PORTS,
  defaultBoilerValves: DEFAULT_BOILER_VALVES,
  mechanicalPipeRate: DEFAULT_MECHANICAL_PIPE_RATE,
  pressurizedPipeRate: DEFAULT_PRESSURISED_PIPE_RATE,
};

export function listTurbineDesigns(
  minSize: number = MIN_TURBINE_SIZE,
  maxSize: number = MAX_TURBINE_SIZE
): IndustrialTurbineCost[] {
  const designs: IndustrialTurbineCost[] = [];
  for (let size = minSize; size <= maxSize; size += 1) {
    const maxHeight = Math.min(MAX_TURBINE_HEIGHT, 2 * size - 1);
    for (let height = MIN_TURBINE_HEIGHT; height <= maxHeight; height += 1) {
      designs.push(
        calculateIndustrialTurbineCost({
          width: size,
          length: size,
          height,
        })
      );
    }
  }
  return designs;
}

function enumerateTurbines(
  targetPower: number,
  minSize: number,
  maxSize: number
): TurbineCandidate[] {
  const candidates: TurbineCandidate[] = [];
  for (let size = minSize; size <= maxSize; size += 1) {
    const maxHeight = Math.min(MAX_TURBINE_HEIGHT, 2 * size - 1);
    for (let height = MIN_TURBINE_HEIGHT; height <= maxHeight; height += 1) {
      const turbine = calculateIndustrialTurbineCost({
        width: size,
        length: size,
        height,
      });
      const { powerPerTick, maxSteamFlow, bladeEfficiency } =
        turbine.performance;
      if (powerPerTick <= 0) {
        continue;
      }
      if (powerPerTick + 1e-6 < targetPower) {
        continue;
      }
      const utilisation = targetPower / powerPerTick;
      const requiredSteam = utilisation * maxSteamFlow;
      if (requiredSteam - maxSteamFlow > 1e-6) {
        continue;
      }
      if (bladeEfficiency <= 0) {
        continue;
      }
      candidates.push({
        turbine,
        requiredSteam,
        utilisation,
      });
    }
  }
  return candidates;
}

function pickBestTurbine(candidates: TurbineCandidate[]): TurbineCandidate {
  if (!candidates.length) {
    throw new Error('Unable to satisfy target power with any turbine configuration');
  }
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    const current = candidates[i];
    const bestSteam = best.turbine.performance.maxSteamFlow;
    const currentSteam = current.turbine.performance.maxSteamFlow;
    if (currentSteam < bestSteam - 1e-6) {
      best = current;
      continue;
    }
    if (Math.abs(currentSteam - bestSteam) < 1e-6) {
      const bestShell = best.turbine.shell.totalShell;
      const currentShell = current.turbine.shell.totalShell;
      if (currentShell < bestShell) {
        best = current;
      }
    }
  }
  return best;
}

function findReactor(
  burnRequirement: number,
  ports: number
): { cost: FissionReactorCost; capacity: number } {
  let best: { cost: FissionReactorCost; capacity: number } | null = null;
  for (let width = 3; width <= 18; width += 1) {
    for (let length = 3; length <= 18; length += 1) {
      for (let height = 4; height <= 18; height += 1) {
        const cost = calculateFissionReactorCost({
          width,
          length,
          height,
          ports,
        });
        const capacity = cost.fissileFuelAssemblies;
        if (capacity + 1e-6 < burnRequirement) {
          continue;
        }
        if (!best) {
          best = { cost, capacity };
          continue;
        }
        const bestExcess = best.capacity - burnRequirement;
        const currentExcess = capacity - burnRequirement;
        if (currentExcess < bestExcess - 1e-6) {
          best = { cost, capacity };
          continue;
        }
        if (Math.abs(currentExcess - bestExcess) < 1e-6) {
          if (cost.shell.totalShell < best.cost.shell.totalShell) {
            best = { cost, capacity };
          }
        }
      }
    }
  }
  if (!best) {
    throw new Error('Unable to size a fission reactor for the required burn rate');
  }
  return best;
}

export function planBoiler(
  requirements: { steam: number; hotCoolant: number },
  tuning: BoilerTuning
): BoilerPlan {
  const superheatersNeeded = Math.ceil(
    requirements.steam / tuning.boilCapacityPerSuperheater
  );
  let best: BoilerPlan | null = null;
  for (let width = 3; width <= 18; width += 1) {
    for (let length = 3; length <= 18; length += 1) {
      for (let height = 4; height <= 18; height += 1) {
        const area = width * length;
        for (let h = 2; h < height; h += 1) {
          const waterLayers = h - 1;
          const steamLayers = height - h;
          if (steamLayers < 1 || waterLayers < 1) {
            continue;
          }
          const waterSlots = waterLayers * area;
          if (superheatersNeeded > waterSlots) {
            continue;
          }
          const steamVolume = steamLayers * area;
          const steamCapacity = tuning.steamCapacityPerBlock * steamVolume;
          if (steamCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const boilCapacity =
            tuning.boilCapacityPerSuperheater * superheatersNeeded;
          if (boilCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const waterVolumeBlocks = Math.max(waterSlots - superheatersNeeded, 0);
          const waterCapacity = tuning.waterCapacityPerBlock * waterVolumeBlocks;
          if (waterCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const shell = computeShellBreakdown(
            width,
            height,
            length,
            tuning.defaultBoilerValves
          );
          const hotCoolantCapacity =
            tuning.hotCoolantCapacityPerBlock * waterVolumeBlocks;
          if (
            requirements.hotCoolant > 0 &&
            hotCoolantCapacity + 1e-6 < requirements.hotCoolant
          ) {
            continue;
          }
          const candidate: BoilerPlan = {
            dimensions: { width, height, length },
            shell,
            valves: tuning.defaultBoilerValves,
            waterCavityHeight: waterLayers,
            steamCavityHeight: steamLayers,
            pressureDispersers: Math.max((width - 2) * (length - 2), 0),
            superheatingElements: superheatersNeeded,
            boilCapacity,
            steamCapacity,
            waterCapacity,
            hotCoolantCapacity,
          };
          if (!best) {
            best = candidate;
            continue;
          }
          if (steamCapacity < best.steamCapacity - 1e-6) {
            best = candidate;
            continue;
          }
          if (Math.abs(steamCapacity - best.steamCapacity) < 1e-6) {
            if (shell.totalShell < best.shell.totalShell) {
              best = candidate;
            }
          }
        }
      }
    }
  }
  if (!best) {
    throw new Error('Unable to size a boiler for the required steam throughput');
  }
  return best;
}

export function planFissionPower(
  options: PowerOptimizationOptions
): PowerOptimizationResult {
  if (options.targetPower <= 0) {
    throw new Error('Target power must be greater than zero');
  }
  const overrides = options.overrides ?? {};
  const tuning = {
    steamPerFuel: overrides.steamPerFuel ?? STEAM_PER_FUEL,
    waterCoolantRate: overrides.waterCoolantRate ?? WATER_COOLANT_RATE,
    sodiumCoolantRate: overrides.sodiumCoolantRate ?? SODIUM_COOLANT_RATE,
    boilCapacityPerSuperheater:
      overrides.boilCapacityPerSuperheater ?? BOIL_CAPACITY_PER_SUPERHEATER,
    steamCapacityPerBlock:
      overrides.steamCapacityPerBlock ?? STEAM_CAPACITY_PER_BLOCK,
    hotCoolantCapacityPerBlock:
      overrides.hotCoolantCapacityPerBlock ?? HOT_COOLANT_CAPACITY_PER_BLOCK,
    waterCapacityPerBlock:
      overrides.waterCapacityPerBlock ?? WATER_CAPACITY_PER_BLOCK,
    defaultReactorPorts:
      overrides.defaultReactorPorts ?? DEFAULT_REACTOR_PORTS,
    defaultBoilerValves:
      overrides.defaultBoilerValves ?? DEFAULT_BOILER_VALVES,
    mechanicalPipeRate:
      overrides.mechanicalPipeRate ?? DEFAULT_MECHANICAL_PIPE_RATE,
    pressurizedPipeRate:
      overrides.pressurizedPipeRate ?? DEFAULT_PRESSURISED_PIPE_RATE,
  };
  if (tuning.steamPerFuel <= 0) {
    throw new Error('Steam per fuel must be greater than zero');
  }
  if (options.cooling === 'water' && tuning.waterCoolantRate <= 0) {
    throw new Error('Water coolant rate must be greater than zero');
  }
  if (options.cooling === 'sodium' && tuning.sodiumCoolantRate <= 0) {
    throw new Error('Sodium coolant rate must be greater than zero');
  }
  if (tuning.boilCapacityPerSuperheater <= 0) {
    throw new Error('Boil capacity per superheater must be greater than zero');
  }
  if (tuning.steamCapacityPerBlock <= 0) {
    throw new Error('Steam capacity per block must be greater than zero');
  }
  if (tuning.waterCapacityPerBlock <= 0) {
    throw new Error('Water capacity per block must be greater than zero');
  }
  if (tuning.hotCoolantCapacityPerBlock <= 0) {
    throw new Error('Hot coolant capacity per block must be greater than zero');
  }
  if (tuning.defaultReactorPorts < 0) {
    throw new Error('Reactor ports cannot be negative');
  }
  if (tuning.defaultBoilerValves < 0) {
    throw new Error('Boiler valves cannot be negative');
  }
  if (tuning.mechanicalPipeRate <= 0) {
    throw new Error('Mechanical pipe rate must be greater than zero');
  }
  if (tuning.pressurizedPipeRate <= 0) {
    throw new Error('Pressurized pipe rate must be greater than zero');
  }
  const minSize = Math.max(options.minTurbineSize ?? MIN_TURBINE_SIZE, MIN_TURBINE_SIZE);
  const maxSize = Math.min(options.maxTurbineSize ?? MAX_TURBINE_SIZE, MAX_TURBINE_SIZE);
  if (minSize > maxSize) {
    throw new Error('Invalid turbine size range');
  }
  const turbines = enumerateTurbines(options.targetPower, minSize, maxSize);
  const bestTurbine = pickBestTurbine(turbines);

  const requiredSteam = Math.ceil(bestTurbine.requiredSteam);
  const utilisation = bestTurbine.utilisation;
  const headroom =
    bestTurbine.turbine.performance.powerPerTick - options.targetPower;

  const burnRate = requiredSteam / tuning.steamPerFuel;
  const coolantPerTick =
    burnRate *
    (options.cooling === 'sodium'
      ? tuning.sodiumCoolantRate
      : tuning.waterCoolantRate);

  const reactorInfo = findReactor(burnRate, tuning.defaultReactorPorts);

  const needsBoiler = options.cooling === 'sodium' || options.useBoiler === true;
  const boilerPlan = needsBoiler
    ? planBoiler({
        steam: requiredSteam,
        hotCoolant: options.cooling === 'sodium' ? coolantPerTick : 0,
      }, tuning)
    : undefined;

  const reclaimWater =
    options.reclaimWater ?? (options.cooling === 'water' || needsBoiler);
  const reclamation = reclaimWater
    ? bestTurbine.turbine.condensersWithWaterReclamation
    : bestTurbine.turbine.condensersWithoutWaterReclamation;

  return {
    targetPower: options.targetPower,
    turbine: bestTurbine.turbine,
    turbineOperation: {
      requiredSteam,
      utilisation,
      headroom,
    },
    reactor: {
      burnRate,
      coolantPerTick,
      capacity: reactorInfo.capacity,
      cost: reactorInfo.cost,
    },
    boiler: boilerPlan,
    waterReclamation: reclamation,
  };
}
