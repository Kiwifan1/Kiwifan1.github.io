/// <reference types="jasmine" />

import { computeShellBreakdown } from '../structure-shell';

describe('computeShellBreakdown', () => {
  it('computes shell metrics for a cubic structure', () => {
    const result = computeShellBreakdown(5, 5, 5, 10);

    expect(result.totalShell).toBe(98);
    expect(result.faceArea).toBe(54);
    expect(result.edgeCasing).toBe(44);
    expect(result.replacements).toBe(10);

    expect(result.solid.casing).toBe(88);
    expect(result.withGlass.casing).toBe(44);
    expect(result.withGlass.glass).toBe(44);
  });

  it('falls back to edges when replacements exceed face area', () => {
    const result = computeShellBreakdown(3, 3, 3, 50);

    expect(result.totalShell).toBe(26);
    expect(result.faceArea).toBe(6);
    expect(result.edgeCasing).toBe(20);
    expect(result.replacements).toBe(50);
    expect(result.solid.casing).toBe(0);
    expect(result.withGlass.casing).toBe(0);
    expect(result.withGlass.glass).toBe(0);
  });

  it('handles minimal shells with no interior volume', () => {
    const result = computeShellBreakdown(2, 2, 2, 0);

    expect(result.totalShell).toBe(8);
    expect(result.faceArea).toBe(0);
    expect(result.edgeCasing).toBe(8);
    expect(result.solid.casing).toBe(8);
    expect(result.withGlass.casing).toBe(8);
    expect(result.withGlass.glass).toBe(0);
  });
});
