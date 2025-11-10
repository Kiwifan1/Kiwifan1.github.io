import { HEATING, BOILER } from '../models/constants';
import { PowerOptimization, TurbineRotorEvaluation } from '../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization, BoilerConfiguration } from '../models/ThermoelectricBoilerOptimization';

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
}

export interface BoilerSupportPlan {
  configuration: BoilerDimensions;
  perUnitSteam: number;
  perUnitHeat: number;
  perUnitSuperheaters: number;
  count: number;
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
    result.boiler = {
      configuration: boilerDimensions,
      perUnitSteam: boilerConfiguration.production.limit,
      perUnitHeat: heatCapacity,
      perUnitSuperheaters: boilerConfiguration.superheaters,
      count,
      requiredHeat: heatRequirement,
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
  const heatDemand = burnRate * HEATING.SODIUM;
  const steamDemand = heatDemand * HEAT_TO_STEAM_RATIO;
  const boilerConfiguration = resolveBoilerConfiguration(boilerDimensions);
  const { count: boilerCount, heatCapacity } = computeBoilerCount(
    heatDemand,
    steamDemand,
    boilerConfiguration
  );
  const turbineMetrics = resolveTurbineMetrics(turbineDimensions);
  const turbineCount = computeTurbineCount(steamDemand, steamDemand, turbineMetrics);
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
    },
    turbine: {
      configuration: turbineDimensions,
      perUnitSteam: turbineMetrics.effectiveSteamFlow,
      perUnitWater: turbineMetrics.waterFlow,
      perUnitPower: turbineMetrics.powerPerTick,
      count: turbineCount,
    },
  };
}
