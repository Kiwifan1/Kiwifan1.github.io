import { exp } from 'mathjs';
import { IndustrialTurbine } from '../../models/IndustrialTurbine';

describe('IndustrialTurbine', () => {
  it('should create an instance with valid parameters', () => {
    const turbine = new IndustrialTurbine(10, 10, 5);
    expect(turbine).toBeTruthy();
  });

  it('should throw error for invalid length', () => {
    expect(() => new IndustrialTurbine(4, 10, 5)).toThrowError();
    expect(() => new IndustrialTurbine(18, 10, 5)).toThrowError();
  });

  it('should throw error for invalid height', () => {
    expect(() => new IndustrialTurbine(10, 4, 5)).toThrowError();
    expect(() => new IndustrialTurbine(10, 19, 5)).toThrowError();
  });

  it('should calculate optimal sizing', () => {
    expect(IndustrialTurbine.getOptimalDisperserOffset(10, 10)).toBe(3);
  });
});
