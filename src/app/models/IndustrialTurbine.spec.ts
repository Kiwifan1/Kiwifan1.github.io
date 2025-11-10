import { IndustrialTurbine } from './IndustrialTurbine';
import { ENERGY_PER_STEAM, STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';

describe('IndustrialTurbine', () => {
  describe('constructor validation', () => {
    it('rejects dimensions outside the supported range', () => {
      expect(() => new IndustrialTurbine(4, 10, 3)).toThrowError(/Length must be between/);
      expect(() => new IndustrialTurbine(18, 10, 3)).toThrowError(/Length must be between/);
      expect(() => new IndustrialTurbine(6, 4, 3)).toThrowError(/Height must be between/);
      expect(() => new IndustrialTurbine(6, 19, 3)).toThrowError(/Height must be between/);
    });

    it('rejects rotor counts that violate design constraints', () => {
      expect(() => new IndustrialTurbine(7, 9, 0)).toThrowError(/At least one rotor/);
      const maxRotor = IndustrialTurbine.getMaxRotorCount(7);
      expect(() => new IndustrialTurbine(7, 9, maxRotor + 1)).toThrowError(/Rotor count cannot exceed/);
      expect(() => new IndustrialTurbine(7, 6, 5)).toThrowError(/Rotor stack must leave space/);
    });

    it('enforces blade, coil, and condenser option bounds', () => {
      expect(() => new IndustrialTurbine(7, 9, 3, { bladeCount: 10, coilCount: 1 })).toThrowError(
        /Blade count must be between/
      );

      const baseline = new IndustrialTurbine(7, 9, 3);
      const maxCondensers = baseline.getMaxCondensers();
      expect(() => new IndustrialTurbine(7, 9, 3, { condenserCount: maxCondensers + 1 })).toThrowError(
        /Condenser count must be between/
      );

      expect(() => new IndustrialTurbine(7, 9, 3, { bladeCount: -1 })).toThrowError(/Blade count must be between/);
    });
  });

  describe('derived metrics', () => {
    it('computes vent, flow, and energy figures for a balanced build', () => {
      const turbine = new IndustrialTurbine(10, 12, 5);

      expect(turbine.getInteriorSpan()).toBe(8);
      expect(turbine.getInteriorHeight()).toBe(10);

      const ventPlan = turbine.getVentPlan();
      expect(ventPlan).toEqual({ ceiling: 64, side: 160, total: 224, steamLayers: 5 });

      expect(turbine.getDisperserCount()).toBe(63);

      const bladeRate = turbine.getBladeRate();
      expect(bladeRate).toBeCloseTo(10 / IndustrialTurbine.MAX_BLADES, 6);

      const flow = turbine.getSteamFlow();
      expect(flow.ventFlow).toBeCloseTo(9_739_130.688, 3);
      expect(flow.disperserFlow).toBeCloseTo(25_804_800, 3);
      expect(flow.maxSteamFlow).toBeCloseTo(9_739_130.688, 3);
      expect(flow.limiting).toBe('vent');

      const throughput = turbine.getEffectiveSteamThroughput();
      expect(throughput).toBeCloseTo(flow.maxSteamFlow, 3);

      const energy = turbine.getEnergyProduction();
      const expectedEnergy = ENERGY_PER_STEAM * bladeRate * throughput;
      expect(energy).toBeCloseTo(expectedEnergy, 3);

      expect(turbine.getSteamStorage()).toEqual({
        steam: 20_480_000,
        energy: 19_200_000_000,
      });

      expect(turbine.getMaxCondensers()).toBe(253);

      const transport = turbine.getTransportPlan();
      expect(transport.condensersRequired).toBe(77);
      expect(transport.condensersInstalled).toBe(77);
      expect(transport.condensersMax).toBe(253);
      expect(transport.steamFlow).toBeCloseTo(flow.maxSteamFlow, 3);
      expect(transport.waterFlow).toBeCloseTo(flow.maxSteamFlow, 3);
      expect(transport.steamPipes).toBe(39);
      expect(transport.waterPipes).toBe(153);
    });

    it('caps throughput when condenser capacity is the bottleneck', () => {
      const condenserLimited = new IndustrialTurbine(7, 9, 3, { condenserCount: 10 });
      const flow = condenserLimited.getSteamFlow();
      const throughput = condenserLimited.getEffectiveSteamThroughput();

      expect(throughput).toBeCloseTo(10 * TURBINE.CONDENSER_RATE, 3);
      expect(throughput).toBeLessThan(flow.maxSteamFlow);

      const transport = condenserLimited.getTransportPlan();
      expect(transport.steamFlow).toBeCloseTo(throughput, 3);
      expect(transport.waterFlow).toBeCloseTo(throughput, 3);
      expect(transport.condensersInstalled).toBe(10);
      expect(transport.steamPipes).toBe(Math.ceil(throughput / STEAM_PIPE.RATE));
      expect(transport.waterPipes).toBe(Math.ceil(throughput / WATER_PIPE.RATE));
    });

    it('accepts custom blade and coil configurations', () => {
      const turbine = new IndustrialTurbine(7, 9, 3, { bladeCount: 4, coilCount: 5 });
      const bladeRate = turbine.getBladeRate();
      expect(bladeRate).toBeCloseTo(4 / IndustrialTurbine.MAX_BLADES, 6);
    });
  });
});
