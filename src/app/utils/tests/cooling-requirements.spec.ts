import {
  computeSodiumCoolingRequirements,
  computeWaterCoolingRequirements,
} from '../cooling-requirements';
import { PowerOptimization } from '../../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization } from '../../models/ThermoelectricBoilerOptimization';
import { FissionReactor } from '../../models/FissionReactor';
import { BOILER, HEATING } from '../../models/constants';

describe('cooling requirements utilities', () => {
  const turbineDimensions = { length: 17, height: 18 };
  const boilerDimensions = { width: 18, length: 18, height: 18 };

  describe('computeWaterCoolingRequirements', () => {
    const waterBurnRate = new FissionReactor(18, 18, 18, 'water').getMaxBurnRate();

    it('calculates turbine counts that satisfy steam and water demand', () => {
      const { optimal } = PowerOptimization.findOptimalDesign(
        turbineDimensions.length,
        turbineDimensions.height
      );
      const perTurbineSteam = optimal.effectiveSteamFlow;
      const burnRate = waterBurnRate;

      const result = computeWaterCoolingRequirements(burnRate, turbineDimensions);

      console.log('[Water] turbine-only plan', {
        burnRate,
        steamDemand: result.steamDemand,
        perTurbineSteam,
        perTurbineWater: optimal.waterFlow,
        turbineCount: result.turbine.count,
      });

      expect(result.steamDemand).toBeCloseTo(burnRate * HEATING.WATER, 6);
      expect(result.waterDemand).toBeCloseTo(result.steamDemand, 6);
      expect(result.turbine.perUnitSteam).toBeCloseTo(perTurbineSteam, 6);
      expect(result.turbine.perUnitWater).toBeCloseTo(optimal.waterFlow, 6);
      const expectedTurbines = Math.max(
        Math.ceil(result.steamDemand / perTurbineSteam),
        Math.ceil(result.waterDemand / optimal.waterFlow)
      );
      expect(result.turbine.count).toBe(expectedTurbines);
      expect(result.boiler).toBeUndefined();
    });

    it('optionally sizes boilers when a configuration is supplied', () => {
      const turbine = PowerOptimization.findOptimalDesign(
        turbineDimensions.length,
        turbineDimensions.height
      ).optimal;
      const boiler = ThermoelectricBoilerOptimization.findOptimalConfiguration(
        boilerDimensions.width,
        boilerDimensions.length,
        boilerDimensions.height
      ).optimal;

      const perTurbineSteam = turbine.effectiveSteamFlow;
      const burnRate = waterBurnRate;
      const steamDemand = burnRate * HEATING.WATER;
      const heatToSteamRatio =
        ThermoelectricBoiler.STEAM_PER_SUPERHEATER / BOILER.SUPERHEATING_HEAT_TRANSFER;
      const heatRequirement = steamDemand / heatToSteamRatio;
      const perBoilerHeat = Math.min(
        boiler.superheaters * BOILER.SUPERHEATING_HEAT_TRANSFER,
        boiler.production.limit / heatToSteamRatio
      );
      const perBoilerSteam = boiler.production.limit;

      const result = computeWaterCoolingRequirements(burnRate, turbineDimensions, boilerDimensions);

      console.log('[Water] with boiler plan', {
        burnRate,
        steamDemand,
        heatRequirement,
        perBoilerHeat,
        perBoilerSteam,
        boilerCount: result.boiler?.count,
        turbineCount: result.turbine.count,
      });

      expect(result.boiler).toBeDefined();
      const plan = result.boiler!;
      const expectedBoilers = Math.max(
        Math.ceil(heatRequirement / perBoilerHeat),
        Math.ceil(steamDemand / perBoilerSteam)
      );

      expect(plan.count).toBe(expectedBoilers);
      expect(plan.perUnitSteam).toBeCloseTo(perBoilerSteam, 6);
      expect(plan.perUnitHeat).toBeCloseTo(perBoilerHeat, 6);
      expect(plan.perUnitSuperheaters).toBe(boiler.superheaters);
      expect(plan.requiredHeat).toBeCloseTo(heatRequirement, 6);
      const expectedTurbines = Math.max(
        Math.ceil(steamDemand / perTurbineSteam),
        Math.ceil(steamDemand / turbine.waterFlow)
      );

      expect(result.turbine.count).toBe(expectedTurbines);
    });
  });

  describe('computeSodiumCoolingRequirements', () => {
    const sodiumBurnRate = new FissionReactor(18, 18, 18, 'sodium').getMaxBurnRate();

    it('produces boiler and turbine counts that absorb reactor heat', () => {
      const turbine = PowerOptimization.findOptimalDesign(
        turbineDimensions.length,
        turbineDimensions.height
      ).optimal;
      const boiler = ThermoelectricBoilerOptimization.findOptimalConfiguration(
        boilerDimensions.width,
        boilerDimensions.length,
        boilerDimensions.height
      ).optimal;

      const heatToSteamRatio =
        ThermoelectricBoiler.STEAM_PER_SUPERHEATER / BOILER.SUPERHEATING_HEAT_TRANSFER;
      const perBoilerHeat = Math.min(
        boiler.superheaters * BOILER.SUPERHEATING_HEAT_TRANSFER,
        boiler.production.limit / heatToSteamRatio
      );
      const perBoilerSteam = boiler.production.limit;
      const burnRate = sodiumBurnRate;
      const heatDemand = burnRate * HEATING.SODIUM;
      const steamDemand = heatDemand * heatToSteamRatio;

      const result = computeSodiumCoolingRequirements(
        burnRate,
        turbineDimensions,
        boilerDimensions
      );

      console.log('[Sodium] full plan', {
        burnRate,
        heatDemand,
        steamDemand,
        perBoilerHeat,
        perBoilerSteam,
        boilerCount: result.boiler.count,
        perTurbineSteam: turbine.effectiveSteamFlow,
        turbineCount: result.turbine.count,
      });

      const expectedBoilers = Math.max(
        Math.ceil(heatDemand / perBoilerHeat),
        Math.ceil(steamDemand / perBoilerSteam)
      );
      const expectedTurbines = Math.max(
        Math.ceil(steamDemand / turbine.effectiveSteamFlow),
        Math.ceil(steamDemand / turbine.waterFlow)
      );

      expect(result.boiler.count).toBe(expectedBoilers);
      expect(result.boiler.perUnitSteam).toBeCloseTo(perBoilerSteam, 6);
      expect(result.boiler.perUnitHeat).toBeCloseTo(perBoilerHeat, 6);
      expect(result.turbine.count).toBe(expectedTurbines);
      expect(result.turbine.perUnitSteam).toBeCloseTo(turbine.effectiveSteamFlow, 6);
      expect(result.turbine.perUnitWater).toBeCloseTo(turbine.waterFlow, 6);
      expect(result.steamDemand).toBeCloseTo(steamDemand, 6);
      expect(result.heatDemand).toBeCloseTo(heatDemand, 6);
    });
  });
});
