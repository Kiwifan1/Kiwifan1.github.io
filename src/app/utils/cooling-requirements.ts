import { HEATING, BOILER } from '../models/constants';
import { PowerOptimization, TurbineRotorEvaluation } from '../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization, BoilerConfiguration } from '../models/ThermoelectricBoilerOptimization';
import { IndustrialTurbine } from '../models/IndustrialTurbine';
import { computeShellBreakdown } from './structure-shell';
import { ShellBreakdown } from '../models/Shell';

export interface TurbineDimensions {
  length: number;
  height: number;
}

export interface BoilerDimensions {
  width: number;
  length: number;
  height: number;
}

export interface TurbineSupportPlan {
  configuration: TurbineDimensions;
  perUnitSteam: number;
  perUnitWater: number;
  perUnitPower: number;
  count: number;
  construction: {
    perUnit: TurbineConstructionSummary;
    total: TurbineConstructionSummary;
  };
}

export interface BoilerSupportPlan {
  configuration: BoilerDimensions;
  perUnitSteam: number;
  perUnitHeat: number;
  perUnitSuperheaters: number;
  count: number;
  construction: {
    perUnit: BoilerConstructionSummary;
    total: BoilerConstructionSummary;
  };
  layout: BoilerLayoutSummary;
}

export interface WaterCoolingRequirements {
  burnRate: number;
  steamDemand: number;
  waterDemand: number;
  turbine: TurbineSupportPlan;
  boiler?: BoilerSupportPlan & { requiredHeat: number };
}

export interface SodiumCoolingRequirements {
  burnRate: number;
  heatDemand: number;
  steamDemand: number;
  boiler: BoilerSupportPlan;
  turbine: TurbineSupportPlan;
}

const STEAM_PER_SUPERHEATER = ThermoelectricBoiler.STEAM_PER_SUPERHEATER;
const HEAT_TO_STEAM_RATIO = STEAM_PER_SUPERHEATER / BOILER.SUPERHEATING_HEAT_TRANSFER;
const TURBINE_REQUIRED_PORTS = 3; // steam input, water output, power output
const BOILER_REQUIRED_PORTS = 3; // water input, steam output, coolant handling
const BOILER_RECOMMENDED_VALVES = 2;
const BOILER_RESISTIVE_HEATERS = 1;

function scaleShellBreakdown(shell: ShellBreakdown, factor: number): ShellBreakdown {
  return {
    solid: {
      casing: shell.solid.casing * factor,
      glass: shell.solid.glass * factor,
    },
    withGlass: {
      casing: shell.withGlass.casing * factor,
      glass: shell.withGlass.glass * factor,
    },
    totalShell: shell.totalShell * factor,
    faceArea: shell.faceArea * factor,
    edgeCasing: shell.edgeCasing * factor,
    replacements: shell.replacements * factor,
  };
}

function buildTurbineConstructionSummary(
  dimensions: TurbineDimensions,
  metrics: TurbineRotorEvaluation
): TurbineConstructionSummary {
  const turbine = new IndustrialTurbine(dimensions.length, dimensions.height, metrics.rotorCount, {
    bladeCount: metrics.bladeCount,
    coilCount: metrics.coilCount,
    condenserCount: metrics.condensersInstalled,
  });
  const shell = computeShellBreakdown(
    dimensions.length,
    dimensions.height,
    dimensions.length,
    TURBINE_REQUIRED_PORTS
  );
  const ventPlan = turbine.getVentPlan();
  const internals: TurbineConstructionInternals = {
    rotorShaft: metrics.rotorCount,
    rotorBlades: metrics.bladeCount,
    electromagneticCoils: metrics.coilCount,
    pressureDispersers: turbine.getDisperserCount(),
    saturatingCondensers: metrics.condenserCapacity > 0 ? metrics.condensersInstalled : 0,
    vents: {
      ceiling: ventPlan.ceiling,
      sides: ventPlan.side,
      total: ventPlan.total,
    },
  };

  const geometry: TurbineGeometrySummary = {
    exteriorLength: dimensions.length,
    exteriorHeight: dimensions.height,
    interiorSpan: turbine.getInteriorSpan(),
    rotorLayers: metrics.rotorCount,
    ventLayers: metrics.ventLayers,
  };

  return {
    shell,
    internals,
    geometry,
  };
}

function scaleTurbineConstructionSummary(
  summary: TurbineConstructionSummary,
  factor: number
): TurbineConstructionSummary {
  return {
    shell: scaleShellBreakdown(summary.shell, factor),
    internals: {
      rotorShaft: summary.internals.rotorShaft * factor,
      rotorBlades: summary.internals.rotorBlades * factor,
      electromagneticCoils: summary.internals.electromagneticCoils * factor,
      pressureDispersers: summary.internals.pressureDispersers * factor,
      saturatingCondensers: summary.internals.saturatingCondensers * factor,
      vents: {
        ceiling: summary.internals.vents.ceiling * factor,
        sides: summary.internals.vents.sides * factor,
        total: summary.internals.vents.total * factor,
      },
    },
    geometry: summary.geometry,
  };
}

function buildBoilerConstructionSummary(
  dimensions: BoilerDimensions,
  configuration: BoilerConfiguration
): BoilerConstructionSummary {
  const shell = computeShellBreakdown(
    dimensions.width,
    dimensions.height,
    dimensions.length,
    BOILER_REQUIRED_PORTS
  );
  const interiorWidth = Math.max(dimensions.width - 2, 0);
  const interiorLength = Math.max(dimensions.length - 2, 0);
  const pressureDispersers = interiorWidth * interiorLength;
  const internals: BoilerConstructionInternals = {
    superheaters: configuration.superheaters,
    pressureDispersers,
    valves: BOILER_RECOMMENDED_VALVES,
    resistiveHeatingElements: BOILER_RESISTIVE_HEATERS,
  };

  const geometry: BoilerGeometrySummary = {
    exteriorWidth: dimensions.width,
    exteriorLength: dimensions.length,
    exteriorHeight: dimensions.height,
    interiorWidth,
    interiorLength,
    waterLayers: configuration.waterLayers,
    steamLayers: configuration.steamLayers,
  };

  return {
    shell,
    internals,
    geometry,
  };
}

function scaleBoilerConstructionSummary(
  summary: BoilerConstructionSummary,
  factor: number
): BoilerConstructionSummary {
  return {
    shell: scaleShellBreakdown(summary.shell, factor),
    internals: {
      superheaters: summary.internals.superheaters * factor,
      pressureDispersers: summary.internals.pressureDispersers * factor,
      valves: summary.internals.valves * factor,
      resistiveHeatingElements: summary.internals.resistiveHeatingElements * factor,
    },
    geometry: summary.geometry,
  };
}

export interface TurbineConstructionInternals {
  rotorShaft: number;
  rotorBlades: number;
  electromagneticCoils: number;
  pressureDispersers: number;
  saturatingCondensers: number;
  vents: {
    ceiling: number;
    sides: number;
    total: number;
  };
}

export interface TurbineGeometrySummary {
  exteriorLength: number;
  exteriorHeight: number;
  interiorSpan: number;
  rotorLayers: number;
  ventLayers: number;
}

export interface TurbineConstructionSummary {
  shell: ShellBreakdown;
  internals: TurbineConstructionInternals;
  geometry: TurbineGeometrySummary;
}

export interface BoilerConstructionInternals {
  superheaters: number;
  pressureDispersers: number;
  valves: number;
  resistiveHeatingElements: number;
}

export interface BoilerGeometrySummary {
  exteriorWidth: number;
  exteriorLength: number;
  exteriorHeight: number;
  interiorWidth: number;
  interiorLength: number;
  waterLayers: number;
  steamLayers: number;
}

export interface BoilerConstructionSummary {
  shell: ShellBreakdown;
  internals: BoilerConstructionInternals;
  geometry: BoilerGeometrySummary;
}

export interface BoilerLayoutSummary {
  waterLayers: number;
  steamLayers: number;
  superheaters: number;
}

function resolveTurbineMetrics(dimensions: TurbineDimensions): TurbineRotorEvaluation {
  const { optimal } = PowerOptimization.findOptimalDesign(dimensions.length, dimensions.height);
  if (optimal.effectiveSteamFlow <= 0) {
    throw new Error('Turbine configuration cannot process any steam');
  }
  if (optimal.waterFlow <= 0) {
    throw new Error('Turbine configuration cannot condense any water');
  }
  return optimal;
}

function resolveBoilerConfiguration(dimensions: BoilerDimensions): BoilerConfiguration {
  const { optimal } = ThermoelectricBoilerOptimization.findOptimalConfiguration(
    dimensions.width,
    dimensions.length,
    dimensions.height
  );
  if (optimal.superheaters <= 0) {
    throw new Error('Boiler configuration must include at least one superheating element');
  }
  if (optimal.production.limit <= 0) {
    throw new Error('Boiler configuration cannot produce any steam');
  }
  return optimal;
}

function computeTurbineCount(
  steamDemand: number,
  waterDemand: number,
  metrics: TurbineRotorEvaluation
): number {
  if (steamDemand <= 0 && waterDemand <= 0) {
    return 0;
  }
  const steamLimited = steamDemand > 0 ? Math.ceil(steamDemand / metrics.effectiveSteamFlow) : 0;
  const waterLimited = waterDemand > 0 ? Math.ceil(waterDemand / metrics.waterFlow) : 0;
  return Math.max(steamLimited, waterLimited, 1);
}

function computeBoilerCount(
  heatDemand: number,
  steamDemand: number,
  configuration: BoilerConfiguration
): { count: number; heatCapacity: number } {
  if (heatDemand <= 0 && steamDemand <= 0) {
    return { count: 0, heatCapacity: 0 };
  }
  const heatCapacityFromSuperheaters = configuration.superheaters * BOILER.SUPERHEATING_HEAT_TRANSFER;
  const heatCapacityFromSteamLimit = configuration.production.limit / HEAT_TO_STEAM_RATIO;
  const perBoilerHeatCapacity = Math.min(heatCapacityFromSuperheaters, heatCapacityFromSteamLimit);
  if (perBoilerHeatCapacity <= 0) {
    throw new Error('Boiler configuration cannot absorb heat');
  }
  const boilersByHeat = heatDemand > 0 ? Math.ceil(heatDemand / perBoilerHeatCapacity) : 0;
  const boilersBySteam = steamDemand > 0 ? Math.ceil(steamDemand / configuration.production.limit) : 0;
  const count = Math.max(boilersByHeat, boilersBySteam, 1);
  return { count, heatCapacity: perBoilerHeatCapacity };
}

export function computeWaterCoolingRequirements(
  burnRate: number,
  turbineDimensions: TurbineDimensions,
  boilerDimensions?: BoilerDimensions
): WaterCoolingRequirements {
  if (!Number.isFinite(burnRate) || burnRate < 0) {
    throw new Error('Burn rate must be a non-negative finite number');
  }
  const steamDemand = burnRate * HEATING.WATER;
  const waterDemand = steamDemand;
  const metrics = resolveTurbineMetrics(turbineDimensions);
  const turbineCount = computeTurbineCount(steamDemand, waterDemand, metrics);
  const turbineConstruction = buildTurbineConstructionSummary(turbineDimensions, metrics);
  const result: WaterCoolingRequirements = {
    burnRate,
    steamDemand,
    waterDemand,
    turbine: {
      configuration: turbineDimensions,
      perUnitSteam: metrics.effectiveSteamFlow,
      perUnitWater: metrics.waterFlow,
      perUnitPower: metrics.powerPerTick,
      count: turbineCount,
      construction: {
        perUnit: turbineConstruction,
        total: scaleTurbineConstructionSummary(turbineConstruction, turbineCount),
      },
    },
  };

  if (boilerDimensions) {
    const steamToCover = steamDemand;
    const heatRequirement = steamToCover / HEAT_TO_STEAM_RATIO;
    const boilerConfiguration = resolveBoilerConfiguration(boilerDimensions);
    const { count, heatCapacity } = computeBoilerCount(
      heatRequirement,
      steamToCover,
      boilerConfiguration
    );
    const boilerConstruction = buildBoilerConstructionSummary(boilerDimensions, boilerConfiguration);
    result.boiler = {
      configuration: boilerDimensions,
      perUnitSteam: boilerConfiguration.production.limit,
      perUnitHeat: heatCapacity,
      perUnitSuperheaters: boilerConfiguration.superheaters,
      count,
      requiredHeat: heatRequirement,
      construction: {
        perUnit: boilerConstruction,
        total: scaleBoilerConstructionSummary(boilerConstruction, count),
      },
      layout: {
        waterLayers: boilerConfiguration.waterLayers,
        steamLayers: boilerConfiguration.steamLayers,
        superheaters: boilerConfiguration.superheaters,
      },
    };
  }

  return result;
}

export function computeSodiumCoolingRequirements(
  burnRate: number,
  turbineDimensions: TurbineDimensions,
  boilerDimensions: BoilerDimensions
): SodiumCoolingRequirements {
  if (!Number.isFinite(burnRate) || burnRate < 0) {
    throw new Error('Burn rate must be a non-negative finite number');
  }
  const hotCoolantDemand = burnRate * HEATING.SODIUM;
  const steamDemand = hotCoolantDemand;
  const heatDemand = steamDemand / HEAT_TO_STEAM_RATIO;
  const boilerConfiguration = resolveBoilerConfiguration(boilerDimensions);
  const { count: boilerCount, heatCapacity } = computeBoilerCount(
    heatDemand,
    steamDemand,
    boilerConfiguration
  );
  const turbineMetrics = resolveTurbineMetrics(turbineDimensions);
  const turbineCount = computeTurbineCount(steamDemand, steamDemand, turbineMetrics);
  const turbineConstruction = buildTurbineConstructionSummary(turbineDimensions, turbineMetrics);
  const boilerConstruction = buildBoilerConstructionSummary(boilerDimensions, boilerConfiguration);
  return {
    burnRate,
    heatDemand,
    steamDemand,
    boiler: {
      configuration: boilerDimensions,
      perUnitSteam: boilerConfiguration.production.limit,
      perUnitHeat: heatCapacity,
      perUnitSuperheaters: boilerConfiguration.superheaters,
      count: boilerCount,
      construction: {
        perUnit: boilerConstruction,
        total: scaleBoilerConstructionSummary(boilerConstruction, boilerCount),
      },
      layout: {
        waterLayers: boilerConfiguration.waterLayers,
        steamLayers: boilerConfiguration.steamLayers,
        superheaters: boilerConfiguration.superheaters,
      },
    },
    turbine: {
      configuration: turbineDimensions,
      perUnitSteam: turbineMetrics.effectiveSteamFlow,
      perUnitWater: turbineMetrics.waterFlow,
      perUnitPower: turbineMetrics.powerPerTick,
      count: turbineCount,
      construction: {
        perUnit: turbineConstruction,
        total: scaleTurbineConstructionSummary(turbineConstruction, turbineCount),
      },
    },
  };
}
