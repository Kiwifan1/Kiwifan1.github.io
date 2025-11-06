/// <reference types="jasmine" />

import { calculateThermoelectricBoilerCost } from '../thermoelectric-boiler-cost';

describe('calculateThermoelectricBoilerCost', () => {
  it('produces the expected metrics for a max-sized boiler', () => {
    const result = calculateThermoelectricBoilerCost();

    expect(result.dimensions.width).toBe(18);
    expect(result.dimensions.height).toBe(18);
    expect(result.dimensions.length).toBe(18);
    expect(result.valves).toBe(1);
    expect(result.waterCavityHeight).toBe(15);
    expect(result.steamCavityHeight).toBe(2);
    expect(result.pressureDispersers).toBe(256);
  expect(result.superheatingElements).toBe(232);
    const waterCapacity = result.waterVolume * 16_000;
  const boilCapacity = result.superheatingElements * 320_000;
    const steamCapacity = result.steamVolume * 160_000;
  expect(waterCapacity).toBe(74_048_000);
  expect(boilCapacity).toBe(74_240_000);
    expect(steamCapacity).toBe(103_680_000);
    expect(result.shell.totalShell).toBeGreaterThan(0);
  });

  it('clamps inputs and respects valve replacements', () => {
    const result = calculateThermoelectricBoilerCost({
      width: 2,
      height: 3,
      length: 2,
      valves: 5,
    });

    expect(result.dimensions.width).toBe(3);
    expect(result.dimensions.height).toBe(4);
    expect(result.dimensions.length).toBe(3);
    expect(result.valves).toBe(5);
    expect(result.waterCavityHeight).toBe(2);
    expect(result.steamCavityHeight).toBe(1);
    expect(result.pressureDispersers).toBe(1);
  expect(result.superheatingElements).toBe(1);
  expect(result.waterVolume).toBe(17);
    expect(result.steamVolume).toBe(9);
    expect(result.shell.replacements).toBe(5);
  });
});
