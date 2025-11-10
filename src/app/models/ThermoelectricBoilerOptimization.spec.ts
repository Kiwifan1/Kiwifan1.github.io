import { ThermoelectricBoiler } from './ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization } from './ThermoelectricBoilerOptimization';

describe('ThermoelectricBoilerOptimization', () => {
  describe('enumerateConfigurations', () => {
    it('generates every feasible layout and derives matching boiler metrics', () => {
      const configurations = ThermoelectricBoilerOptimization.enumerateConfigurations(3, 3, 6);
      expect(configurations.length).toBe(94);

      const sample = configurations.find(
        (candidate) => candidate.h === 3 && candidate.superheaters === 5
      );
      expect(sample).toBeDefined();
      if (!sample) {
        return;
      }

      const boiler = new ThermoelectricBoiler(3, 3, 6, {
        waterCavityHeight: sample.waterLayers,
        superheaterCount: sample.superheaters,
      });

      expect(sample.capacities).toEqual(boiler.getCapacities());
      expect(sample.production).toEqual(boiler.getProductionLimit());
      expect(sample.balancedSuperheaters).toBe(Math.ceil(boiler.getBalancedSuperheaterEstimate()));
      expect(sample.waterToBoilDelta).toBe(boiler.getWaterToBoilDelta());
      expect(sample.steamSafe).toBe(boiler.isSteamNonLimiting());
    });

    it('validates dimensions before enumerating candidates', () => {
      expect(() => ThermoelectricBoilerOptimization.enumerateConfigurations(2, 3, 6)).toThrowError(
        /Width must be between/
      );
      expect(() => ThermoelectricBoilerOptimization.enumerateConfigurations(3, 2, 6)).toThrowError(
        /Length must be between/
      );
      expect(() => ThermoelectricBoilerOptimization.enumerateConfigurations(3, 3, 3)).toThrowError(
        /Height must be between/
      );
    });
  });

  describe('findOptimalConfiguration', () => {
    it('picks the highest production configuration with tie-breakers applied', () => {
      const result = ThermoelectricBoilerOptimization.findOptimalConfiguration(3, 3, 6);
      const enumeration = ThermoelectricBoilerOptimization.enumerateConfigurations(3, 3, 6);
      const expectedOptimal = enumeration.reduce((optimal, current) => {
        if (current.production.limit > optimal.production.limit) {
          return current;
        }
        if (current.production.limit === optimal.production.limit) {
          const optimalDelta = Math.abs(optimal.waterToBoilDelta);
          const currentDelta = Math.abs(current.waterToBoilDelta);
          if (currentDelta < optimalDelta) {
            return current;
          }
          if (currentDelta === optimalDelta && current.superheaters < optimal.superheaters) {
            return current;
          }
        }
        return optimal;
      }, enumeration[0]);

      expect(result.candidates).toEqual(enumeration);
      expect(result.optimal).toEqual(expectedOptimal);
      expect(result.recommendedH).toBe(ThermoelectricBoiler.getSteamSafeH(6));
    });

    describe('findMaxOptimalConfiguration', () => {
      it('finds the optimal configuration for maximum allowed dimensions', () => {
        const result = ThermoelectricBoilerOptimization.findOptimalConfiguration(
          ThermoelectricBoiler.MAX_WIDTH,
          ThermoelectricBoiler.MAX_LENGTH,
          ThermoelectricBoiler.MAX_HEIGHT
        );
        expect(result.optimal.width).toBe(ThermoelectricBoiler.MAX_WIDTH);
        expect(result.optimal.length).toBe(ThermoelectricBoiler.MAX_LENGTH);
        expect(result.optimal.height).toBe(ThermoelectricBoiler.MAX_HEIGHT);
      });
    });

    it('validates dimensions before searching for an optimum', () => {
      expect(() => ThermoelectricBoilerOptimization.findOptimalConfiguration(2, 3, 6)).toThrowError(
        /Width must be between/
      );
      expect(() => ThermoelectricBoilerOptimization.findOptimalConfiguration(3, 2, 6)).toThrowError(
        /Length must be between/
      );
      expect(() => ThermoelectricBoilerOptimization.findOptimalConfiguration(3, 3, 3)).toThrowError(
        /Height must be between/
      );
    });
  });
});
