import { ThermoelectricBoiler, ThermoelectricBoilerCapacities, ThermoelectricBoilerProduction } from './ThermoelectricBoiler';

export interface BoilerConfiguration {
  width: number;
  length: number;
  height: number;
  h: number;
  waterLayers: number;
  steamLayers: number;
  superheaters: number;
  capacities: ThermoelectricBoilerCapacities;
  production: ThermoelectricBoilerProduction;
  balancedSuperheaters: number;
  waterToBoilDelta: number;
  steamSafe: boolean;
}

export interface BoilerOptimizationResult {
  optimal: BoilerConfiguration;
  recommendedH: number;
  candidates: BoilerConfiguration[];
}

export class ThermoelectricBoilerOptimization {
  public static findOptimalConfiguration(
    width: number,
    length: number,
    height: number
  ): BoilerOptimizationResult {
    ThermoelectricBoilerOptimization.validateDimensions(width, length, height);

    const candidates = ThermoelectricBoilerOptimization.enumerateConfigurations(width, length, height);
    if (candidates.length === 0) {
      throw new Error('No feasible boiler configurations found for the provided dimensions');
    }

    const optimal = candidates.reduce((best, current) => {
      if (current.production.limit > best.production.limit) {
        return current;
      }
      if (current.production.limit === best.production.limit) {
        const bestDelta = Math.abs(best.waterToBoilDelta);
        const currentDelta = Math.abs(current.waterToBoilDelta);
        if (currentDelta < bestDelta) {
          return current;
        }
        if (currentDelta === bestDelta && current.superheaters < best.superheaters) {
          return current;
        }
      }
      return best;
    });

    const recommendedH = ThermoelectricBoiler.getSteamSafeH(height);
    return { optimal, recommendedH, candidates };
  }

  public static enumerateConfigurations(
    width: number,
    length: number,
    height: number
  ): BoilerConfiguration[] {
    ThermoelectricBoilerOptimization.validateDimensions(width, length, height);
    const area = ThermoelectricBoiler.getLayerArea(width, length);
    const candidates: BoilerConfiguration[] = [];

    for (let h = 2; h <= height - 1; h += 1) {
      const waterLayers = h - 1;
      const steamLayers = height - h;
      if (steamLayers < 1) {
        continue;
      }

      const maxSuperheaters = waterLayers * area;
      for (let superheaters = 0; superheaters <= maxSuperheaters; superheaters += 1) {
        const boiler = new ThermoelectricBoiler(width, length, height, {
          waterCavityHeight: waterLayers,
          superheaterCount: superheaters,
        });

        const capacities = boiler.getCapacities();
        const production = boiler.getProductionLimit();
        const balancedSuperheaters = Math.ceil(boiler.getBalancedSuperheaterEstimate());
        const waterToBoilDelta = boiler.getWaterToBoilDelta();

        candidates.push({
          width,
          length,
          height,
          h,
          waterLayers,
          steamLayers,
          superheaters,
          capacities,
          production,
          balancedSuperheaters,
          waterToBoilDelta,
          steamSafe: boiler.isSteamNonLimiting(),
        });
      }
    }

    return candidates;
  }

  private static validateDimensions(width: number, length: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(length) || !Number.isFinite(height)) {
      throw new Error('Width, length, and height must be finite numbers');
    }
    if (!Number.isInteger(width) || !Number.isInteger(length) || !Number.isInteger(height)) {
      throw new Error('Width, length, and height must be whole numbers');
    }
    if (width < ThermoelectricBoiler.MIN_WIDTH || width > ThermoelectricBoiler.MAX_WIDTH) {
      throw new Error(
        `Width must be between ${ThermoelectricBoiler.MIN_WIDTH} and ${ThermoelectricBoiler.MAX_WIDTH}`
      );
    }
    if (length < ThermoelectricBoiler.MIN_LENGTH || length > ThermoelectricBoiler.MAX_LENGTH) {
      throw new Error(
        `Length must be between ${ThermoelectricBoiler.MIN_LENGTH} and ${ThermoelectricBoiler.MAX_LENGTH}`
      );
    }
    if (height < ThermoelectricBoiler.MIN_HEIGHT || height > ThermoelectricBoiler.MAX_HEIGHT) {
      throw new Error(
        `Height must be between ${ThermoelectricBoiler.MIN_HEIGHT} and ${ThermoelectricBoiler.MAX_HEIGHT}`
      );
    }
  }
}
