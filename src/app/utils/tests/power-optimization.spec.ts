/// <reference types="jasmine" />

import { planFissionPower } from '../power-optimization';

describe('planFissionPower', () => {
  it('returns a coherent plan for water-cooled targets without a boiler', () => {
    const result = planFissionPower({
      targetPower: 100_000_000,
      cooling: 'water',
    });

    expect(result.targetPower).toBe(100_000_000);
    expect(result.boiler).toBeUndefined();
    expect(result.turbine.performance.powerPerTick).toBeGreaterThanOrEqual(100_000_000);
    expect(result.turbineOperation.requiredSteam).toBe(
      Math.ceil(result.turbineOperation.utilisation * result.turbine.performance.maxSteamFlow)
    );
    expect(result.turbineOperation.headroom).toBeCloseTo(
      result.turbine.performance.powerPerTick - result.targetPower,
      6
    );
    expect(result.reactor.coolantPerTick).toBe(result.turbineOperation.requiredSteam);
    expect(result.reactor.burnRate).toBeCloseTo(
      result.turbineOperation.requiredSteam / 20_000,
      6
    );
    expect(result.reactor.cost.fissileFuelAssemblies).toBeGreaterThanOrEqual(
      Math.ceil(result.reactor.burnRate)
    );
    expect(result.waterReclamation).toEqual(
      result.turbine.condensersWithWaterReclamation
    );
  });

  it('includes a boiler plan when sodium cooling is required', () => {
    const result = planFissionPower({
      targetPower: 120_000_000,
      cooling: 'sodium',
    });

    expect(result.boiler).toBeDefined();
    expect(result.boiler?.steamCapacity).toBeGreaterThanOrEqual(
      result.turbineOperation.requiredSteam
    );
    expect(result.boiler?.boilCapacity).toBeGreaterThanOrEqual(
      result.turbineOperation.requiredSteam
    );
    expect(result.boiler?.hotCoolantCapacity).toBeGreaterThanOrEqual(
      result.reactor.coolantPerTick
    );
    expect(result.reactor.burnRate).toBeCloseTo(
      result.turbineOperation.requiredSteam / 20_000,
      6
    );
    expect(result.reactor.coolantPerTick).toBeCloseTo(
      result.turbineOperation.requiredSteam * 10,
      6
    );
    expect(result.waterReclamation).toEqual(
      result.turbine.condensersWithWaterReclamation
    );
  });

  it('throws when the target power is non-positive', () => {
    expect(() =>
      planFissionPower({
        targetPower: 0,
        cooling: 'water',
      })
    ).toThrowError('Target power must be greater than zero');
  });

  it('honours tuning overrides when provided', () => {
    const result = planFissionPower({
      targetPower: 95_000_000,
      cooling: 'water',
      overrides: {
        steamPerFuel: 40_000,
        waterCoolantRate: 30_000,
      },
    });

    const expectedBurnRate =
      result.turbineOperation.requiredSteam / 40_000;
    expect(result.reactor.burnRate).toBeCloseTo(expectedBurnRate, 6);
    expect(result.reactor.coolantPerTick).toBeCloseTo(
      expectedBurnRate * 30_000,
      6
    );
  });
});
