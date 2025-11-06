/// <reference types="jasmine" />

import { calculateFissionReactorCost } from '../fission-reactor-cost';

describe('calculateFissionReactorCost', () => {
  it('returns the default max-sized reactor when no overrides are provided', () => {
    const result = calculateFissionReactorCost();

  expect(result.dimensions.width).toBe(18);
  expect(result.dimensions.height).toBe(18);
  expect(result.dimensions.length).toBe(18);
    expect(result.ports).toBe(4);
    expect(result.controlRodColumns).toBe(256);
    expect(result.controlRodAssemblies).toBe(256);
    expect(result.fissileFuelAssemblies).toBe(3840);
    expect(result.shell.totalShell).toBeGreaterThan(0);
  });

  it('clamps dimensions and ports to the supported minimums', () => {
    const result = calculateFissionReactorCost({
      width: 2,
      height: 3,
      length: 2,
      ports: -5,
    });

  expect(result.dimensions.width).toBe(3);
  expect(result.dimensions.height).toBe(4);
  expect(result.dimensions.length).toBe(3);
    expect(result.ports).toBe(0);
    expect(result.controlRodColumns).toBe(1);
    expect(result.controlRodAssemblies).toBe(1);
    expect(result.fissileFuelAssemblies).toBe(1);
  });
});
