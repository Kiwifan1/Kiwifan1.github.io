import { IndustrialTurbine } from './IndustrialTurbine';
import { ENERGY_PER_STEAM, TURBINE } from './constants';

export type SteamLimiter = 'vent' | 'disperser';

export interface TurbineRotorEvaluation {
  length: number;
  height: number;
  interiorHeight: number;
  rotorCount: number;
  ventLayers: number;
  steamLayers: number;
  ventCount: number;
  disperserCount: number;
  bladeCount: number;
  coilCount: number;
  bladeEfficiency: number;
  theoreticalSteamFlow: number;
  effectiveSteamFlow: number;
  limiting: SteamLimiter;
  powerPerTick: number;
  steamStorage: number;
  energyStorage: number;
  condensersRequired: number;
  condensersInstalled: number;
  condensersMax: number;
  condenserCapacity: number;
  waterFlow: number;
  steamPipeCount: number;
  waterPipeCount: number;
}

export interface TurbineOptimizationResult {
  optimal: TurbineRotorEvaluation;
  rotorEstimate: number;
  rotorRange: { min: number; max: number };
  candidates: TurbineRotorEvaluation[];
}

export class PowerOptimization {
  public static findOptimalDesign(length: number, height: number): TurbineOptimizationResult {
    PowerOptimization.validateDimensions(length, height);
    const range = PowerOptimization.computeRotorBounds(length, height);
    const candidates = PowerOptimization.evaluateAllRotorHeights(length, height, range);
    if (candidates.length === 0) {
      throw new Error('No feasible rotor configurations were found for the provided dimensions');
    }
    const optimal = candidates.reduce((best, current) =>
      current.powerPerTick > best.powerPerTick ? current : best
    );
    const rotorEstimate = PowerOptimization.estimateRotorCount(length, height, range);
    return { optimal, rotorEstimate, rotorRange: range, candidates };
  }

  public static evaluateRotorHeight(
    length: number,
    height: number,
    rotorCount: number
  ): TurbineRotorEvaluation {
    PowerOptimization.validateDimensions(length, height);
    const range = PowerOptimization.computeRotorBounds(length, height);
    if (rotorCount < range.min || rotorCount > range.max) {
      throw new Error(`Rotor height must be between ${range.min} and ${range.max}`);
    }

    const turbine = new IndustrialTurbine(length, height, rotorCount);
    const interiorHeight = turbine.getInteriorHeight();
    const ventPlan = turbine.getVentPlan();
    const flow = turbine.getSteamFlow();
    const bladeRate = turbine.getBladeRate();
    const storage = turbine.getSteamStorage();
    const transport = turbine.getTransportPlan();

  const theoreticalSteamFlow = flow.maxSteamFlow;
  const condensersRequired = Math.ceil(theoreticalSteamFlow / TURBINE.CONDENSER_RATE);
  const condensersInstalled = turbine.condenserCount;
  const condensersMax = turbine.getMaxCondensers();
  const condenserCapacity = condensersInstalled * TURBINE.CONDENSER_RATE;
  const effectiveSteamFlow = transport.steamFlow;

    const powerPerTick = ENERGY_PER_STEAM * bladeRate * effectiveSteamFlow;

    return {
      length,
      height,
      interiorHeight,
      rotorCount,
      ventLayers: ventPlan.steamLayers,
      steamLayers: Math.max(ventPlan.steamLayers - 1, 0),
      ventCount: ventPlan.total,
      disperserCount: turbine.getDisperserCount(),
      bladeCount: turbine.bladeCount,
      coilCount: turbine.coilCount,
      bladeEfficiency: bladeRate,
      theoreticalSteamFlow,
      effectiveSteamFlow,
      limiting: flow.limiting,
      powerPerTick,
      steamStorage: storage.steam,
      energyStorage: storage.energy,
      condensersRequired,
      condensersInstalled,
      condensersMax,
      condenserCapacity,
      waterFlow: transport.waterFlow,
      steamPipeCount: transport.steamPipes,
      waterPipeCount: transport.waterPipes,
    };
  }

  public static estimateRotorCount(
    length: number,
    height: number,
    range?: { min: number; max: number }
  ): number {
    PowerOptimization.validateDimensions(length, height);
    const bounds = range ?? PowerOptimization.computeRotorBounds(length, height);
    const interiorSpan = length - 2;
    const interiorHeight = height - 2;
    const denominator = 8 * interiorSpan;
    if (denominator === 0) {
      return bounds.min;
    }
    const numerator = 4 * interiorSpan * interiorHeight + interiorSpan * interiorSpan;
    const raw = Math.ceil(numerator / denominator);
    return Math.min(Math.max(raw, bounds.min), bounds.max);
  }

  public static evaluateAllRotorHeights(
    length: number,
    height: number,
    range?: { min: number; max: number }
  ): TurbineRotorEvaluation[] {
    PowerOptimization.validateDimensions(length, height);
    const bounds = range ?? PowerOptimization.computeRotorBounds(length, height);
    const evaluations: TurbineRotorEvaluation[] = [];
    for (let rotor = bounds.min; rotor <= bounds.max; rotor += 1) {
      evaluations.push(PowerOptimization.evaluateRotorHeight(length, height, rotor));
    }
    return evaluations;
  }

  private static computeRotorBounds(length: number, height: number): { min: number; max: number } {
    const interiorHeight = height - 2;
    if (interiorHeight < 2) {
      throw new Error('Interior height must be at least two blocks to fit rotors and disperser');
    }
    const maxByGeometry = IndustrialTurbine.getMaxRotorCount(length);
    const maxByInterior = interiorHeight - 1;
    const max = Math.min(maxByGeometry, maxByInterior);
    if (max < 1) {
      throw new Error('Not enough space for any rotor layers');
    }
    return { min: 1, max };
  }

  private static validateDimensions(length: number, height: number): void {
    if (!Number.isFinite(length) || !Number.isFinite(height)) {
      throw new Error('Length and height must be finite numbers');
    }
    if (!Number.isInteger(length) || !Number.isInteger(height)) {
      throw new Error('Length and height must be whole numbers');
    }
    if (length < IndustrialTurbine.MIN_LENGTH || length > IndustrialTurbine.MAX_LENGTH) {
      throw new Error(
        `Length must be between ${IndustrialTurbine.MIN_LENGTH} and ${IndustrialTurbine.MAX_LENGTH}`
      );
    }
    const maxHeight = Math.min(IndustrialTurbine.MAX_HEIGHT, 2 * length - 1);
    if (height < IndustrialTurbine.MIN_HEIGHT || height > maxHeight) {
      throw new Error(
        `Height must be between ${IndustrialTurbine.MIN_HEIGHT} and ${maxHeight} for length ${length}`
      );
    }
  }
}
