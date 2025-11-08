import { IndustrialTurbine } from './IndustrialTurbine';
import { STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';

describe('IndustrialTurbine', () => {
  describe('constructor validation', () => {
    it('rejects lengths outside the supported range', () => {
      expect(() => new IndustrialTurbine(4, 10, 5)).toThrowError(/Length must be between/);
      expect(() => new IndustrialTurbine(18, 10, 5)).toThrowError(/Length must be between/);
    });

    it('rejects heights outside the supported range', () => {
      expect(() => new IndustrialTurbine(6, 4, 3)).toThrowError(/Height must be between/);
      expect(() => new IndustrialTurbine(6, 19, 3)).toThrowError(/Height must be between/);
    });

    it('rejects disperser offsets outside the valid interior span', () => {
      expect(() => new IndustrialTurbine(6, 8, 1)).toThrowError(/Disperser offset must be between/);
      expect(() => new IndustrialTurbine(6, 8, 7)).toThrowError(/Disperser offset must be between/);
    });
  });

  describe('volume calculations', () => {
    const length = 10;
    const height = 12;
    const disperserOffset = 6;
    const turbine = new IndustrialTurbine(length, height, disperserOffset);

    it('tracks interior dimensions', () => {
      expect(turbine.interiorLength).toBe(8);
      expect(turbine.interiorHeight).toBe(10);
    });

    it('derives lower and upper heights', () => {
      expect(turbine.getLowerHeight()).toBe(5);
      expect(turbine.getUpperHeight()).toBe(6);
      expect(turbine.getLowerInteriorHeight()).toBe(4);
      expect(turbine.getUpperInteriorHeight()).toBe(5);
    });

    it('computes total, lower, upper, and disperser volumes', () => {
      expect(turbine.getVolume()).toBe(length ** 2 * height);
      expect(turbine.getLowerVolume()).toBe(length ** 2 * turbine.getLowerHeight());
      expect(turbine.getUpperVolume()).toBe(length ** 2 * turbine.getUpperHeight());
      expect(turbine.getDisperserVolume()).toBe(length ** 2);
    });

    it('computes interior volumes for each segment', () => {
      const interiorArea = turbine.interiorLength ** 2;
      expect(turbine.getInteriorVolume()).toBe(interiorArea * turbine.interiorHeight);
      expect(turbine.getLowerInteriorVolume()).toBe(
        interiorArea * turbine.getLowerInteriorHeight()
      );
      expect(turbine.getUpperInteriorVolume()).toBe(
        interiorArea * turbine.getUpperInteriorHeight()
      );
      expect(turbine.getDisperserInteriorVolume()).toBe(interiorArea);
    });

    it('keeps shell volumes consistent across segments', () => {
      const totalShell = turbine.getShellVolume();
      const segmentedShell =
        turbine.getLowerShellVolume() +
        turbine.getUpperShellVolume() +
        turbine.getDisperserShellVolume();

      expect(segmentedShell).toBe(totalShell);
    });
  });

  describe('static helpers', () => {
    const length = 10;

    it('derives vent counts for the side layers and the ceiling', () => {
      expect(IndustrialTurbine.getVentsPerSteamlayer(length)).toBe(4 * (length - 2));
      expect(IndustrialTurbine.getVentsForCeiling(length)).toBe((length - 2) ** 2);
    });

    it('derives disperser counts and per-layer capacities', () => {
      expect(IndustrialTurbine.getDisperserAmount(length)).toBe((length - 2) ** 2 - 1);
      expect(IndustrialTurbine.getSteamCapacityPerLayer(length)).toBe(
        TURBINE.CHEMICAL_PER_TANK * (length - 2) ** 2
      );
    });

    it('limits blade rate by the lesser of blade and coil capacity', () => {
      const coilLimited = IndustrialTurbine.getBladeRate(1, IndustrialTurbine.MAX_BLADES);
      expect(coilLimited).toBeCloseTo(
        (1 * TURBINE.BLADES_PER_COIL) / IndustrialTurbine.MAX_BLADES,
        6
      );

      const bladeLimited = IndustrialTurbine.getBladeRate(5, 20);
      expect(bladeLimited).toBeCloseTo(20 / IndustrialTurbine.MAX_BLADES, 6);
    });

    it('calculates vent and disperser flows', () => {
      const vents = 120;
      const dispersers = IndustrialTurbine.getDisperserAmount(length);
      const rotorLayers = 4;

      const ventFlow = IndustrialTurbine.getVentFlow(vents);
      const disperserFlow = IndustrialTurbine.getSteamFlow(length, dispersers, rotorLayers);
      const limitingFlow = IndustrialTurbine.getMaxFlow(length, rotorLayers, vents, dispersers);

      expect(limitingFlow).toBe(Math.min(ventFlow, disperserFlow));
    });

    it('derives storage and pipe requirements from throughput figures', () => {
      const rotorLayers = 3;
      const dispersers = IndustrialTurbine.getDisperserAmount(length);
      const steamFlow = IndustrialTurbine.getSteamFlow(length, dispersers, rotorLayers);

      expect(IndustrialTurbine.getSteamStorage(length, rotorLayers)).toBe(
        length ** 2 * rotorLayers * TURBINE.CHEMICAL_PER_TANK
      );
      expect(IndustrialTurbine.getEnergyStorage(length, length + 2)).toBe(
        length ** 2 * (length + 2) * TURBINE.ENERGY_CAPACITY_PER_VOLUME
      );

      const condensersNeeded = IndustrialTurbine.getWaterFlow(5);
      expect(IndustrialTurbine.getWaterPipeCount(condensersNeeded)).toBe(
        Math.ceil(condensersNeeded / WATER_PIPE.RATE)
      );
      expect(IndustrialTurbine.getSteamPipeCount(steamFlow)).toBe(
        Math.ceil(steamFlow / STEAM_PIPE.RATE)
      );
    });
  });

  describe('getOptimalDisperserOffset', () => {
    it('returns the optimal disperser offset for given length and height', () => {
      expect(IndustrialTurbine.getOptimalDisperserOffset(10, 10)).toBe(5);
    });
  });
});
