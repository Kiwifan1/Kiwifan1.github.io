import {
  calculateFissionReactorCost,
  FissionReactorCost,
} from './fission-reactor-cost';
import {
  calculateIndustrialTurbineCost,
  IndustrialTurbineCost,
  IndustrialTurbineWaterReclamation,
} from './industrial-turbine-cost';
import { computeShellBreakdown, ShellBreakdown } from './structure-shell';

interface TurbineCandidate {
  turbine: IndustrialTurbineCost;
  requiredSteam: number;
  utilisation: number;
}

interface BoilerPlan {
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

export type CoolingMode = 'water' | 'sodium';

export interface PowerOptimizationOptions {
  targetPower: number;
  cooling: CoolingMode;
  useBoiler?: boolean;
  reclaimWater?: boolean;
  minTurbineSize?: number;
  maxTurbineSize?: number;
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

const MIN_TURBINE_SIZE = 5;
const MAX_TURBINE_SIZE = 17;
const MIN_TURBINE_HEIGHT = 5;
const MAX_TURBINE_HEIGHT = 18;
const WATER_COOLANT_RATE = 20_000;
const SODIUM_COOLANT_RATE = 200_000;
const STEAM_PER_FUEL = 20_000;
const BOIL_CAPACITY_PER_SUPERHEATER = 320_000;
const STEAM_CAPACITY_PER_BLOCK = 160_000;
const HOT_COOLANT_CAPACITY_PER_BLOCK = 256_000;
const WATER_CAPACITY_PER_BLOCK = 16_000;
const DEFAULT_REACTOR_PORTS = 4;
const DEFAULT_BOILER_VALVES = 4;

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

function findBoiler(requirements: { steam: number; hotCoolant: number }): BoilerPlan {
  const superheatersNeeded = Math.ceil(requirements.steam / BOIL_CAPACITY_PER_SUPERHEATER);
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
          const steamCapacity = STEAM_CAPACITY_PER_BLOCK * steamVolume;
          if (steamCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const boilCapacity = BOIL_CAPACITY_PER_SUPERHEATER * superheatersNeeded;
          if (boilCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const waterVolumeBlocks = Math.max(waterSlots - superheatersNeeded, 0);
          const waterCapacity = WATER_CAPACITY_PER_BLOCK * waterVolumeBlocks;
          if (waterCapacity + 1e-6 < requirements.steam) {
            continue;
          }
          const shell = computeShellBreakdown(
            width,
            height,
            length,
            DEFAULT_BOILER_VALVES
          );
          const hotCoolantCapacity = HOT_COOLANT_CAPACITY_PER_BLOCK * waterVolumeBlocks;
          if (requirements.hotCoolant > 0 && hotCoolantCapacity + 1e-6 < requirements.hotCoolant) {
            continue;
          }
          const candidate: BoilerPlan = {
            dimensions: { width, height, length },
            shell,
            valves: DEFAULT_BOILER_VALVES,
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

  const burnRate = requiredSteam / STEAM_PER_FUEL;
  const coolantPerTick =
    burnRate *
    (options.cooling === 'sodium' ? SODIUM_COOLANT_RATE : WATER_COOLANT_RATE);

  const reactorInfo = findReactor(burnRate, DEFAULT_REACTOR_PORTS);

  const needsBoiler = options.cooling === 'sodium' || options.useBoiler === true;
  const boilerPlan = needsBoiler
    ? findBoiler({
        steam: requiredSteam,
        hotCoolant: options.cooling === 'sodium' ? coolantPerTick : 0,
      })
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
