import { IndustrialTurbine } from './IndustrialTurbine';
import { PowerOptimization } from './TurbinePowerOptimization';
import { STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';

describe('TurbinePowerOptimization', () => {
  describe('evaluateRotorHeight', () => {
    it('summarises turbine metrics for a given configuration', () => {
      const evaluation = PowerOptimization.evaluateRotorHeight(7, 9, 3);
      const turbine = new IndustrialTurbine(7, 9, 3);
      const ventPlan = turbine.getVentPlan();
      const flow = turbine.getSteamFlow();
      const transport = turbine.getTransportPlan();
      const storage = turbine.getSteamStorage();

      expect(evaluation.length).toBe(7);
      expect(evaluation.height).toBe(9);
      expect(evaluation.interiorHeight).toBe(turbine.getInteriorHeight());
      expect(evaluation.rotorCount).toBe(3);
      expect(evaluation.ventLayers).toBe(ventPlan.steamLayers);
      expect(evaluation.steamLayers).toBe(Math.max(ventPlan.steamLayers - 1, 0));
      expect(evaluation.ventCount).toBe(ventPlan.total);
      expect(evaluation.disperserCount).toBe(turbine.getDisperserCount());
      expect(evaluation.bladeCount).toBe(turbine.bladeCount);
      expect(evaluation.coilCount).toBe(turbine.coilCount);
      expect(evaluation.bladeEfficiency).toBeCloseTo(turbine.getBladeRate(), 6);
      expect(evaluation.theoreticalSteamFlow).toBeCloseTo(flow.maxSteamFlow, 3);
      expect(evaluation.effectiveSteamFlow).toBeCloseTo(transport.steamFlow, 3);
      expect(evaluation.limiting).toBe(flow.limiting);
      expect(evaluation.powerPerTick).toBeCloseTo(turbine.getEnergyProduction(), 3);
      expect(evaluation.steamStorage).toBe(storage.steam);
      expect(evaluation.energyStorage).toBe(storage.energy);
      expect(evaluation.condensersRequired).toBe(
        Math.ceil(flow.maxSteamFlow / TURBINE.CONDENSER_RATE)
      );
      expect(evaluation.condensersInstalled).toBe(turbine.condenserCount);
      expect(evaluation.condensersMax).toBe(turbine.getMaxCondensers());
      expect(evaluation.condenserCapacity).toBe(turbine.condenserCount * TURBINE.CONDENSER_RATE);
      expect(evaluation.waterFlow).toBeCloseTo(transport.waterFlow, 3);
      expect(evaluation.steamPipeCount).toBe(Math.ceil(transport.steamFlow / STEAM_PIPE.RATE));
      expect(evaluation.waterPipeCount).toBe(Math.ceil(transport.waterFlow / WATER_PIPE.RATE));
    });

    it('rejects rotor heights outside the feasible range', () => {
      expect(() => PowerOptimization.evaluateRotorHeight(7, 9, 0)).toThrowError(
        /Rotor height must be between/
      );
      expect(() => PowerOptimization.evaluateRotorHeight(7, 9, 10)).toThrowError(
        /Rotor height must be between/
      );
    });
  });

  describe('evaluateAllRotorHeights', () => {
    it('covers the full inclusive rotor range', () => {
      const evaluations = PowerOptimization.evaluateAllRotorHeights(7, 9);
      expect(evaluations.length).toBe(6);
      expect(evaluations[0].rotorCount).toBe(1);
      expect(evaluations[evaluations.length - 1].rotorCount).toBe(6);
    });
  });

  describe('estimateRotorCount', () => {
    it('returns the heuristic rotor estimate within bounds', () => {
      const estimate = PowerOptimization.estimateRotorCount(7, 9);
      expect(estimate).toBe(5);
    });
  });

  describe('findOptimalDesign', () => {
    it('selects the candidate with the highest power output', () => {
      const result = PowerOptimization.findOptimalDesign(7, 9);
      const manualCandidates = PowerOptimization.evaluateAllRotorHeights(7, 9);
      const expectedOptimal = manualCandidates.reduce((best, current) =>
        current.powerPerTick > best.powerPerTick ? current : best
      );

      expect(result.candidates).toEqual(manualCandidates);
      expect(result.optimal).toEqual(expectedOptimal);
      expect(result.rotorRange).toEqual({ min: 1, max: 6 });
      expect(result.rotorEstimate).toBe(5);
    });

    it('validates turbine dimensions before evaluating candidates', () => {
      expect(() => PowerOptimization.findOptimalDesign(4, 9)).toThrowError(
        /Length must be between/
      );
      expect(() => PowerOptimization.findOptimalDesign(7, 4)).toThrowError(
        /Height must be between/
      );
    });

    describe('findMaxOptimalDesign', () => {
      it('finds the optimal design for maximum allowed dimensions', () => {
        const result = PowerOptimization.findOptimalDesign(
          IndustrialTurbine.MAX_LENGTH,
          IndustrialTurbine.MAX_HEIGHT
        );
        expect(result.optimal.length).toBe(IndustrialTurbine.MAX_LENGTH);
        expect(result.optimal.height).toBe(IndustrialTurbine.MAX_HEIGHT);
      });
    });
  });
});
