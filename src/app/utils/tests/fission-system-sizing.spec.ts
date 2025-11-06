/// <reference types="jasmine" />

import { calculateFissionReactorCost } from '../fission-reactor-cost';
import { calculateIndustrialTurbineCost } from '../industrial-turbine-cost';
import { calculateThermoelectricBoilerCost } from '../thermoelectric-boiler-cost';

describe('fission system sizing', () => {
  const reactor = calculateFissionReactorCost({ width: 18, height: 18, length: 18 });
  const boiler = calculateThermoelectricBoilerCost({ width: 18, height: 18, length: 18 });
  const turbine = calculateIndustrialTurbineCost({ width: 17, height: 18, length: 17 });
  const burnRateTarget = 1_400; // sustainable maximum before hitting 1200 K
  const steamDemand = burnRateTarget * 20_000;

  it('confirms turbine counts for the water-cooled loop', () => {
    const minimalTurbines = Math.ceil(steamDemand / turbine.performance.maxSteamFlow);
    const recommendedTurbines = Math.ceil(
      (steamDemand * 1.5) / turbine.performance.maxSteamFlow
    );

    expect(minimalTurbines).toBe(2);
    expect(recommendedTurbines).toBe(3);
  });

  it('confirms boiler and turbine requirements for the sodium loop', () => {
    const hotCoolantDemand = burnRateTarget * 200_000;

    const boilCapacity = boiler.superheatingElements * 320_000;
    const waterCapacity = boiler.waterVolume * 16_000;
    const steamCapacity = boiler.steamVolume * 160_000;
    const hotCoolantCapacity = boiler.steamVolume * 256_000;
    const boilerSteamCapacity = Math.min(boilCapacity, waterCapacity, steamCapacity);

    const boilersForSteam = Math.ceil(steamDemand / boilerSteamCapacity);
    const boilersForHotCoolant = Math.ceil(hotCoolantDemand / hotCoolantCapacity);
    const minimalBoilers = Math.max(boilersForSteam, boilersForHotCoolant);

    const minimalTurbines = Math.ceil(steamDemand / turbine.performance.maxSteamFlow);
    const recommendedTurbines = Math.ceil(
      (steamDemand * 1.5) / turbine.performance.maxSteamFlow
    );

    expect(minimalBoilers).toBe(2);
    expect(minimalTurbines).toBe(2);
    expect(recommendedTurbines).toBe(3);
  });
});
