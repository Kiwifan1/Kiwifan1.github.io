import { ENERGY_PER_STEAM, STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';

export interface IndustrialTurbineOptions {
  bladeCount?: number;
  coilCount?: number;
  condenserCount?: number;
}

export interface IndustrialTurbineFlowStats {
  ventFlow: number;
  disperserFlow: number;
  maxSteamFlow: number;
  limiting: 'vent' | 'disperser';
}

export interface IndustrialTurbineVentPlan {
  ceiling: number;
  side: number;
  total: number;
  steamLayers: number;
}

export interface IndustrialTurbineStorage {
  steam: number;
  energy: number;
}

export interface IndustrialTurbineTransportPlan {
  condensersInstalled: number;
  condensersRequired: number;
  condensersMax: number;
  steamFlow: number;
  waterFlow: number;
  steamPipes: number;
  waterPipes: number;
}

export class IndustrialTurbine {
  public static readonly MIN_LENGTH = 5;
  public static readonly MIN_HEIGHT = 5;
  public static readonly MAX_LENGTH = 17;
  public static readonly MAX_HEIGHT = 18;
  public static readonly MAX_BLADES = 28;

  public readonly length: number;
  public readonly height: number;
  public readonly rotorCount: number;
  public readonly bladeCount: number;
  public readonly coilCount: number;
  public readonly condenserCount: number;

  constructor(length: number, height: number, rotorCount: number, options: IndustrialTurbineOptions = {}) {
    IndustrialTurbine.validateDimensions(length, height);
    IndustrialTurbine.validateRotorCount(length, height, rotorCount);

    this.length = length;
    this.height = height;
    this.rotorCount = rotorCount;

    const maxBladeSupport = Math.min(rotorCount * 2, IndustrialTurbine.MAX_BLADES);
    const rawBladeCount = options.bladeCount ?? maxBladeSupport;
    if (rawBladeCount < 0 || rawBladeCount > maxBladeSupport) {
      throw new Error(`Blade count must be between 0 and ${maxBladeSupport}`);
    }
    this.bladeCount = rawBladeCount;

    const minCoils = Math.ceil(this.bladeCount / TURBINE.BLADES_PER_COIL);
    const requestedCoils = options.coilCount ?? minCoils;
    if (requestedCoils < minCoils) {
      throw new Error(`Coil count must be at least ${minCoils} to support ${this.bladeCount} blades`);
    }
    this.coilCount = requestedCoils;

    const maxCondensers = this.getMaxCondensers();
    const recommendedCondensers = Math.min(
      Math.ceil(this.getSteamFlow().maxSteamFlow / TURBINE.CONDENSER_RATE),
      maxCondensers
    );
    const requestedCondensers = options.condenserCount ?? recommendedCondensers;
    if (requestedCondensers < 0 || requestedCondensers > maxCondensers) {
      throw new Error(`Condenser count must be between 0 and ${maxCondensers}`);
    }
    this.condenserCount = requestedCondensers;
  }

  public static getMaxRotorCount(length: number): number {
    return Math.min(2 * length - 5, 14);
  }

  public getInteriorSpan(): number {
    return Math.max(this.length - 2, 0);
  }

  public getInteriorHeight(): number {
    return Math.max(this.height - 2, 0);
  }

  public getInteriorArea(): number {
    const span = this.getInteriorSpan();
    return span * span;
  }

  public getVentLayers(): number {
    return Math.max(this.getInteriorHeight() - this.rotorCount, 0);
  }

  public getVentPlan(): IndustrialTurbineVentPlan {
    const span = this.getInteriorSpan();
    if (span <= 0) {
      return { ceiling: 0, side: 0, total: 0, steamLayers: 0 };
    }
    const steamLayers = this.getVentLayers();
    const ceiling = span * span;
    const side = 4 * span * steamLayers;
    return {
      ceiling,
      side,
      total: ceiling + side,
      steamLayers,
    };
  }

  public getDisperserCount(): number {
    const span = this.getInteriorSpan();
    if (span <= 0) {
      return 0;
    }
    return span * span - 1;
  }

  public getBladeRate(): number {
    return Math.min(
      this.bladeCount / IndustrialTurbine.MAX_BLADES,
      (this.coilCount * TURBINE.BLADES_PER_COIL) / IndustrialTurbine.MAX_BLADES
    );
  }

  public getSteamFlow(): IndustrialTurbineFlowStats {
    const ventPlan = this.getVentPlan();
    const ventFlow = ventPlan.total * TURBINE.VENT_CHEMICAL_FLOW;
    const interiorArea = this.getInteriorArea();
    const disperserCount = this.getDisperserCount();
    const disperserFlow =
      disperserCount * interiorArea * this.rotorCount * TURBINE.DISPERSER_CHEMICAL_FLOW;
    const maxSteamFlow = Math.min(ventFlow, disperserFlow);
    return {
      ventFlow,
      disperserFlow,
      maxSteamFlow,
      limiting: ventFlow <= disperserFlow ? 'vent' : 'disperser',
    };
  }

  public getEffectiveSteamThroughput(): number {
    const theoretical = this.getSteamFlow().maxSteamFlow;
    const condenserFlow = this.condenserCount * TURBINE.CONDENSER_RATE;
    return Math.min(theoretical, condenserFlow);
  }

  public getEnergyProduction(): number {
    return ENERGY_PER_STEAM * this.getBladeRate() * this.getEffectiveSteamThroughput();
  }

  public getSteamStorage(): IndustrialTurbineStorage {
    const interiorArea = this.getInteriorArea();
    return {
      steam: interiorArea * this.rotorCount * TURBINE.CHEMICAL_PER_TANK,
      energy: this.length ** 2 * this.height * TURBINE.ENERGY_CAPACITY_PER_VOLUME,
    };
  }

  public getMaxCondensers(): number {
    const interiorArea = this.getInteriorArea();
    const availableLayers = Math.max(this.getVentLayers() - 1, 0);
    const slots = interiorArea * availableLayers - this.coilCount;
    return Math.max(slots, 0);
  }

  public getTransportPlan(): IndustrialTurbineTransportPlan {
    const flow = this.getSteamFlow();
    const throughput = this.getEffectiveSteamThroughput();
    const condensersRequired = Math.ceil(flow.maxSteamFlow / TURBINE.CONDENSER_RATE);
    return {
      condensersInstalled: this.condenserCount,
      condensersRequired,
      condensersMax: this.getMaxCondensers(),
      steamFlow: throughput,
      waterFlow: Math.min(this.condenserCount * TURBINE.CONDENSER_RATE, throughput),
      steamPipes: Math.ceil(throughput / STEAM_PIPE.RATE),
      waterPipes: Math.ceil(throughput / WATER_PIPE.RATE),
    };
  }

  private static validateDimensions(length: number, height: number): void {
    if (length < IndustrialTurbine.MIN_LENGTH || length > IndustrialTurbine.MAX_LENGTH) {
      throw new Error(
        `Length must be between ${IndustrialTurbine.MIN_LENGTH} and ${IndustrialTurbine.MAX_LENGTH}`
      );
    }
    if (height < IndustrialTurbine.MIN_HEIGHT || height > IndustrialTurbine.MAX_HEIGHT) {
      throw new Error(
        `Height must be between ${IndustrialTurbine.MIN_HEIGHT} and ${IndustrialTurbine.MAX_HEIGHT}`
      );
    }
  }

  private static validateRotorCount(length: number, height: number, rotorCount: number): void {
    if (rotorCount < 1) {
      throw new Error('At least one rotor is required');
    }
    const maxRotor = IndustrialTurbine.getMaxRotorCount(length);
    if (rotorCount > maxRotor) {
      throw new Error(`Rotor count cannot exceed ${maxRotor} for length ${length}`);
    }
    const interiorHeight = Math.max(height - 2, 0);
    if (rotorCount > interiorHeight - 1) {
      throw new Error('Rotor stack must leave space for the disperser layer');
    }
  }
}
