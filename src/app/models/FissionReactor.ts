import { computeShellBreakdown } from '../utils/structure-shell';
import { CoolingMode, FISSION_REACTOR } from './constants';
import { ShellBreakdown } from './Shell';

export interface FissionReactorCost {
  Shell: ShellBreakdown;
  ControlRods: number;
  FissileFuelAssemblies: number;
  CoolantCapacity: number;
  HotCoolantCapacity: number;
  FuelCapacity: number;
  WasteCapacity: number;
}

export class FissionReactor {
  public static MIN_WIDTH = 3;
  public static MIN_HEIGHT = 4;
  public static MIN_LENGTH = 3;
  public static MAX_WIDTH = 18;
  public static MAX_HEIGHT = 18;
  public static MAX_LENGTH = 18;
  public static VALVES = 4;

  width: number;
  height: number;
  length: number;
  interiorWidth: number;
  interiorHeight: number;
  interiorLength: number;
  coolingMode: CoolingMode;

  constructor(width: number, height: number, length: number, coolingMode: CoolingMode) {
    if (width < FissionReactor.MIN_WIDTH || width > FissionReactor.MAX_WIDTH) {
      throw new Error(
        `Width must be between ${FissionReactor.MIN_WIDTH} and ${FissionReactor.MAX_WIDTH}`
      );
    }
    if (height < FissionReactor.MIN_HEIGHT || height > FissionReactor.MAX_HEIGHT) {
      throw new Error(
        `Height must be between ${FissionReactor.MIN_HEIGHT} and ${FissionReactor.MAX_HEIGHT}`
      );
    }
    if (length < FissionReactor.MIN_LENGTH || length > FissionReactor.MAX_LENGTH) {
      throw new Error(
        `Length must be between ${FissionReactor.MIN_LENGTH} and ${FissionReactor.MAX_LENGTH}`
      );
    }

    this.width = width;
    this.height = height;
    this.length = length;
    this.coolingMode = coolingMode;

    this.interiorWidth = this.width - 2;
    this.interiorHeight = this.height - 2;
    this.interiorLength = this.length - 2;
  }

  getVolume(): number {
    return this.width * this.height * this.length;
  }

  getInteriorVolume(): number {
    return this.interiorWidth * this.interiorHeight * this.interiorLength;
  }

  getShellVolume(): number {
    return this.getVolume() - this.getInteriorVolume();
  }

  getSurfaceArea(): number {
    return (
      2 * (this.interiorWidth * this.interiorHeight) +
      2 * (this.interiorLength * this.interiorHeight) +
      2 * (this.interiorWidth * this.interiorLength)
    );
  }

  getInnerFaceSurfaceArea(): number {
    return this.interiorWidth * this.interiorLength;
  }

  getMaxFuelAssemblies(): number {
    const controlRodColumns = (this.interiorWidth * this.interiorLength) / 2;
    const fissileFuelPerColumn = Math.max(this.interiorHeight - 1, 0);
    return controlRodColumns * fissileFuelPerColumn;
  }

  getMaxControlRodAssemblies(): number {
    return (this.interiorWidth * this.interiorLength) / 2;
  }

  getCost(): ShellBreakdown {
    return computeShellBreakdown(this.width, this.height, this.length, FissionReactor.VALVES);
  }

  getMaxBurnRate(): number {
    return this.getMaxFuelAssemblies() * FISSION_REACTOR.BURN_PER_ASSEMBLY;
  }

  getCoolantCapacity(): number {
    return this.getVolume() * FISSION_REACTOR.COOLED_COOLANT_PER_TANK;
  }

  getHotCoolantCapacity(): number {
    return this.getVolume() * FISSION_REACTOR.HEATED_COOLANT_PER_TANK;
  }

  getMaxFuelCapacity(): number {
    return this.getMaxFuelAssemblies() * FISSION_REACTOR.MAX_FUEL_PER_ASSEMBLY;
  }

  getMaxWasteCapacity(): number {
    return this.getMaxFuelCapacity() * FISSION_REACTOR.MAX_FUEL_PER_ASSEMBLY;
  }

  getHeatCapacity(): { withGlass: number; withoutGlass: number } {
    const shellCost = this.getCost();
    return {
      withoutGlass: shellCost.solid.casing * FISSION_REACTOR.CASING_HEAT_CAPACITY,
      withGlass: shellCost.withGlass.casing * FISSION_REACTOR.CASING_HEAT_CAPACITY,
    };
  }

  getOptimalConstructionItems(): FissionReactorCost {
    const shellCost = this.getCost();
    return {
      Shell: shellCost,
      ControlRods: this.getMaxControlRodAssemblies(),
      FissileFuelAssemblies: this.getMaxFuelAssemblies(),
      CoolantCapacity: this.getCoolantCapacity(),
      HotCoolantCapacity: this.getHotCoolantCapacity(),
      FuelCapacity: this.getMaxFuelCapacity(),
      WasteCapacity: this.getMaxWasteCapacity(),
    };
  }
}
