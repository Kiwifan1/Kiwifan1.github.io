import { computeShellBreakdown, ShellBreakdown } from './structure-shell';

export interface IndustrialTurbineCostOptions {
  width?: number;
  height?: number;
  length?: number;
  valves?: number;
}

export interface IndustrialTurbinePerformance {
  rotorLayers: number;
  steamLayers: number;
  coilBlocks: number;
  bladeBlocks: number;
  ventBlocks: number;
  maxSteamFlow: number;
  bladeEfficiency: number;
  powerPerTick: number;
}

export interface IndustrialTurbineWaterReclamation {
  condensers: number;
  waterThroughput: number;
  mechanicalPipes: number;
}

export interface IndustrialTurbineCost {
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
  shell: ShellBreakdown;
  valves: number;
  pressureDispersers: number;
  rotationalComplex: number;
  performance: IndustrialTurbinePerformance;
  rotors: number;
  blades: number;
  coils: number;
  vents: number;
  condensersWithWaterReclamation: IndustrialTurbineWaterReclamation;
  condensersWithoutWaterReclamation: IndustrialTurbineWaterReclamation;
  steamPipes: number;
}

const STEAM_PER_VENT = 32_000;
const ENERGY_PER_MB = 10;
const BLADES_PER_COIL = 4;
const MAX_BLADES = 28;
const CONDENSER_RATE = 64_000;
const WATER_PIPE_RATE = 64_000;
const STEAM_PIPE_RATE = 1_024_000;

function computeVentCount(
  width: number,
  length: number,
  steamLayers: number
): number {
  const interiorWidth = Math.max(width - 2, 0);
  const interiorLength = Math.max(length - 2, 0);
  const roof = interiorWidth * interiorLength;
  const perimeterPerLayer = 2 * interiorWidth + 2 * interiorLength;
  return roof + perimeterPerLayer * Math.max(steamLayers, 0);
}

export function calculateIndustrialTurbineCost(
  options: IndustrialTurbineCostOptions = {}
): IndustrialTurbineCost {
  const width = Math.max(options.width ?? 17, 5);
  const length = Math.max(options.length ?? width, 5);
  const height = Math.max(options.height ?? 18, 5);
  const valves = Math.max(options.valves ?? 1, 0);

  const interiorHeight = Math.max(height - 2, 0);
  const interiorWidth = Math.max(width - 2, 0);
  const interiorLength = Math.max(length - 2, 0);

  const roofArea = interiorWidth * interiorLength;
  const perimeterPerLayer = 2 * interiorWidth + 2 * interiorLength;

  let bestPower = 0;
  let bestRotorLayers = 0;
  let bestSteamLayers = 0;
  let bestVents = 0;
  let bestMaxSteam = 0;
  let bestBladeRatio = 0;
  let bestBladeBlocks = 0;
  let bestCoils = 0;

  for (let rotorLayers = 1; rotorLayers < interiorHeight; rotorLayers += 1) {
    const steamLayers = interiorHeight - rotorLayers;
    if (steamLayers < 1) {
      continue;
    }

    const ventBlocks = roofArea + perimeterPerLayer * steamLayers;
    const maxSteamFlow = STEAM_PER_VENT * ventBlocks;

    const bladeBlocks = Math.min(rotorLayers * 2, MAX_BLADES);
    const bladeRatio = bladeBlocks / MAX_BLADES;

    const coils = Math.max(1, Math.ceil(bladeBlocks / BLADES_PER_COIL));
    const coilRatio = Math.min(coils / 7, 1);

    const bladeEfficiency = Math.min(bladeRatio, coilRatio);
    const powerPerTick = ENERGY_PER_MB * bladeEfficiency * maxSteamFlow;

    if (powerPerTick > bestPower) {
      bestPower = powerPerTick;
      bestRotorLayers = rotorLayers;
      bestSteamLayers = steamLayers;
      bestVents = ventBlocks;
      bestMaxSteam = maxSteamFlow;
      bestBladeRatio = bladeEfficiency;
      bestBladeBlocks = bladeBlocks;
      bestCoils = coils;
    }
  }

  if (bestRotorLayers === 0) {
    bestRotorLayers = Math.max(interiorHeight - 1, 1);
    bestSteamLayers = Math.max(interiorHeight - bestRotorLayers, 1);
    bestVents = computeVentCount(width, length, bestSteamLayers);
    bestMaxSteam = STEAM_PER_VENT * bestVents;
    bestBladeBlocks = Math.min(bestRotorLayers * 2, MAX_BLADES);
    bestCoils = Math.max(1, Math.ceil(bestBladeBlocks / BLADES_PER_COIL));
    const bladeRatio = bestBladeBlocks / MAX_BLADES;
    const coilRatio = Math.min(bestCoils / 7, 1);
    bestBladeRatio = Math.min(bladeRatio, coilRatio);
    bestPower = ENERGY_PER_MB * bestBladeRatio * bestMaxSteam;
  }

  const shell = computeShellBreakdown(width, height, length, bestVents + valves);

  const pressureDispersers = Math.max(roofArea - 1, 0);
  const rotationalComplex = 1;
  const condensersNeeded = Math.ceil(bestMaxSteam / CONDENSER_RATE);
  const waterThroughput = Math.min(condensersNeeded * CONDENSER_RATE, bestMaxSteam);
  const mechanicalPipes = Math.ceil(waterThroughput / WATER_PIPE_RATE);
  const steamPipes = Math.ceil(bestMaxSteam / STEAM_PIPE_RATE);

  return {
    dimensions: { width, height, length },
    shell,
    valves,
    pressureDispersers,
    rotationalComplex,
    performance: {
      rotorLayers: bestRotorLayers,
      steamLayers: bestSteamLayers,
      coilBlocks: bestCoils,
      bladeBlocks: bestBladeBlocks,
      ventBlocks: bestVents,
      maxSteamFlow: bestMaxSteam,
      bladeEfficiency: bestBladeRatio,
      powerPerTick: bestPower,
    },
    rotors: bestRotorLayers,
    blades: bestBladeBlocks,
    coils: bestCoils,
    vents: bestVents,
    condensersWithWaterReclamation: {
      condensers: condensersNeeded,
      waterThroughput,
      mechanicalPipes,
    },
    condensersWithoutWaterReclamation: {
      condensers: 0,
      waterThroughput: 0,
      mechanicalPipes: 0,
    },
    steamPipes,
  };
}
