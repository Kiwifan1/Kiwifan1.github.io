/// <reference types="jasmine" />

import { calculateIndustrialTurbineCost } from '../industrial-turbine-cost';

describe('calculateIndustrialTurbineCost', () => {
  it('selects the optimal rotor configuration for a max-sized turbine', () => {
    const result = calculateIndustrialTurbineCost();

  expect(result.dimensions.width).toBe(17);
  expect(result.dimensions.height).toBe(18);
  expect(result.dimensions.length).toBe(17);
    expect(result.valves).toBe(1);
    expect(result.rotors).toBe(10);
    expect(result.performance.rotorLayers).toBe(10);
    expect(result.performance.steamLayers).toBe(6);
    expect(result.performance.bladeBlocks).toBe(20);
    expect(result.performance.coilBlocks).toBe(5);
    expect(result.performance.ventBlocks).toBe(585);
    expect(result.performance.maxSteamFlow).toBe(18_720_000);
    expect(result.performance.bladeEfficiency).toBeCloseTo(5 / 7, 6);
    expect(result.performance.powerPerTick).toBeCloseTo(133_714_285.714, 3);
    expect(result.condensersWithWaterReclamation.condensers).toBe(293);
    expect(result.condensersWithWaterReclamation.waterThroughput).toBe(18_720_000);
    expect(result.condensersWithWaterReclamation.mechanicalPipes).toBe(293);
    expect(result.condensersWithoutWaterReclamation.condensers).toBe(0);
    expect(result.steamPipes).toBe(19);
    expect(result.shell.replacements).toBe(result.performance.ventBlocks + result.valves);
  });

  it('clamps inputs and still produces a valid configuration', () => {
    const result = calculateIndustrialTurbineCost({
      width: 4,
      height: 4,
      length: 3,
      valves: -2,
    });

  expect(result.dimensions.width).toBe(5);
  expect(result.dimensions.height).toBe(5);
  expect(result.dimensions.length).toBe(5);
    expect(result.valves).toBe(0);
    expect(result.performance.rotorLayers + result.performance.steamLayers).toBe(
      Math.max(result.dimensions.height - 2, 0)
    );
    expect(result.performance.powerPerTick).toBeGreaterThan(0);
    expect(result.shell.totalShell).toBeGreaterThan(0);
  });
});
