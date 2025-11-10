import { computeShellBreakdown } from '../utils/structure-shell';
import { CoolingMode, FISSION_REACTOR, HEATING } from './constants';
import { ShellBreakdown } from './Shell';

export interface TurbinePairing {
  steamFlow: number;
  waterReturn: number;
}

export interface FissionReactorConstruction {
  Shell: ShellBreakdown;
  ControlRods: number;
  MaxRodHeight: number;
  FissileFuelAssemblies: number;
  CoolantCapacity: number;
  HotCoolantCapacity: number;
  FuelCapacity: number;
  WasteCapacity: number;
}

export type TemperatureState = 'green' | 'yellow' | 'orange' | 'red';

export interface BurnRateAnalysis {
  requested: number;
  achievable: number;
  limiting: 'fuel' | 'steam' | 'water' | 'none';
  heatingPerTick: number;
}

export class FissionReactor {
  public static readonly MIN_WIDTH = 3;
  public static readonly MIN_HEIGHT = 4;
  public static readonly MIN_LENGTH = 3;
  public static readonly MAX_WIDTH = 18;
  public static readonly MAX_HEIGHT = 18;
  public static readonly MAX_LENGTH = 18;
  public static readonly REQUIRED_PORTS = 4;
  public static readonly WATER_COOLING_LIMIT = 75;
  private static readonly DAMAGE_THRESHOLD = 1200;
  private static readonly DAMAGE_CAP = 1800;

  public readonly width: number;
  public readonly height: number;
  public readonly length: number;
  public readonly coolingMode: CoolingMode;
  public readonly interiorWidth: number;
  public readonly interiorHeight: number;
  public readonly interiorLength: number;

  constructor(width: number, height: number, length: number, coolingMode: CoolingMode) {
    FissionReactor.validateDimensions(width, height, length);

    this.width = width;
    this.height = height;
    this.length = length;
    this.coolingMode = coolingMode;
    this.interiorWidth = Math.max(this.width - 2, 0);
    this.interiorHeight = Math.max(this.height - 2, 0);
    this.interiorLength = Math.max(this.length - 2, 0);
  }

  public getVolume(): number {
    return this.width * this.height * this.length;
  }

  public getInteriorVolume(): number {
    return this.interiorWidth * this.interiorHeight * this.interiorLength;
  }

  public getShellVolume(): number {
    return this.getVolume() - this.getInteriorVolume();
  }

  public getInteriorArea(): number {
    return this.interiorWidth * this.interiorLength;
  }

  public getControlRodSlots(): number {
    if (this.interiorWidth <= 0 || this.interiorLength <= 0 || this.interiorHeight < 2) {
      return 0;
    }
    const area = this.getInteriorArea();
    return Math.ceil(area / 2);
  }

  public getMaxRodHeight(): number {
    if (this.interiorHeight < 2) {
      return 0;
    }
    return Math.min(this.interiorHeight - 1, 15);
  }

  public getFuelAssembliesForRodHeight(rodHeight: number): number {
    const cappedHeight = this.clampRodHeight(rodHeight);
    return this.getControlRodSlots() * cappedHeight;
  }

  public getMaxFuelAssemblies(): number {
    return this.getFuelAssembliesForRodHeight(this.getMaxRodHeight());
  }

  public getShellBreakdown(): ShellBreakdown {
    return computeShellBreakdown(
      this.width,
      this.height,
      this.length,
      FissionReactor.REQUIRED_PORTS
    );
  }

  public getMaxBurnRate(): number {
    return this.getMaxFuelAssemblies() * FISSION_REACTOR.BURN_PER_ASSEMBLY;
  }

  public getHeatingRate(mode: CoolingMode = this.coolingMode): number {
    return mode === 'sodium' ? HEATING.SODIUM : HEATING.WATER;
  }

  public getHeatedCoolantPerTick(burnRate: number, mode: CoolingMode = this.coolingMode): number {
    return burnRate * this.getHeatingRate(mode);
  }

  public getCoolantCapacity(): number {
    return this.getVolume() * FISSION_REACTOR.COOLED_COOLANT_PER_TANK;
  }

  public getHotCoolantCapacity(): number {
    return this.getVolume() * FISSION_REACTOR.HEATED_COOLANT_PER_TANK;
  }

  public getMaxFuelCapacity(): number {
    return this.getMaxFuelAssemblies() * FISSION_REACTOR.MAX_FUEL_PER_ASSEMBLY;
  }

  public getMaxWasteCapacity(): number {
    return this.getMaxFuelCapacity();
  }

  public getConstructionSummary(): FissionReactorConstruction {
    return {
      Shell: this.getShellBreakdown(),
      ControlRods: this.getControlRodSlots(),
      MaxRodHeight: this.getMaxRodHeight(),
      FissileFuelAssemblies: this.getMaxFuelAssemblies(),
      CoolantCapacity: this.getCoolantCapacity(),
      HotCoolantCapacity: this.getHotCoolantCapacity(),
      FuelCapacity: this.getMaxFuelCapacity(),
      WasteCapacity: this.getMaxWasteCapacity(),
    };
  }

  public analyseBurnRate(requested: number, pairing?: TurbinePairing): BurnRateAnalysis {
    const fuelLimited = Math.min(requested, this.getMaxBurnRate());
    if (!pairing) {
      return {
        requested,
        achievable: fuelLimited,
        limiting: fuelLimited < requested ? 'fuel' : 'none',
        heatingPerTick: this.getHeatedCoolantPerTick(fuelLimited),
      };
    }
    const steamLimited = Math.min(fuelLimited, pairing.steamFlow);
    const waterLimited = Math.min(steamLimited, pairing.waterReturn);
    let limiting: BurnRateAnalysis['limiting'] = 'none';
    if (waterLimited < steamLimited) {
      limiting = 'water';
    } else if (steamLimited < fuelLimited) {
      limiting = 'steam';
    } else if (fuelLimited < requested) {
      limiting = 'fuel';
    }
    return {
      requested,
      achievable: Math.min(waterLimited, this.getMaxBurnRate()),
      limiting,
      heatingPerTick: this.getHeatedCoolantPerTick(Math.min(waterLimited, this.getMaxBurnRate())),
    };
  }

  public getSafeBurnRate(pairing: TurbinePairing): number {
    const analysis = this.analyseBurnRate(this.getMaxBurnRate(), pairing);
    return analysis.achievable;
  }

  public getPowerFromTurbineBlades(bladeCount: number): number {
    return 7140 * Math.max(bladeCount, 0);
  }

  public getTemperatureState(temperatureK: number): TemperatureState {
    if (temperatureK < 600) {
      return 'green';
    }
    if (temperatureK < 1000) {
      return 'yellow';
    }
    if (temperatureK < FissionReactor.DAMAGE_THRESHOLD) {
      return 'orange';
    }
    return 'red';
  }

  public getDamagePerTick(temperatureK: number): number {
    if (temperatureK <= FissionReactor.DAMAGE_THRESHOLD) {
      return 0;
    }
    const capped = Math.min(temperatureK, FissionReactor.DAMAGE_CAP);
    return capped / 12000;
  }

  public getMeltdownChancePerTick(temperatureK: number, damagePercent: number): number {
    if (temperatureK <= FissionReactor.DAMAGE_THRESHOLD || damagePercent <= 100) {
      return 0;
    }
    return damagePercent / 1000;
  }

  public getRepairPerTick(temperatureK: number): number {
    if (temperatureK >= FissionReactor.DAMAGE_THRESHOLD) {
      return 0;
    }
    return (FissionReactor.DAMAGE_THRESHOLD - temperatureK) / 120000;
  }

  public getWasteBarrelDecayPerMinute(): number {
    return 1;
  }

  public getWasteBarrelDecayPerTick(): number {
    return 1 / 1200;
  }

  public isWaterCoolingRecommended(): boolean {
    return this.getMaxFuelAssemblies() <= FissionReactor.WATER_COOLING_LIMIT;
  }

  public getCoolingAdvice(): CoolingMode {
    if (this.isWaterCoolingRecommended()) {
      return 'water';
    }
    return 'sodium';
  }

  private clampRodHeight(rodHeight: number): number {
    const maxHeight = this.getMaxRodHeight();
    if (rodHeight <= 0) {
      return 0;
    }
    return Math.min(rodHeight, maxHeight);
  }

  private static validateDimensions(width: number, height: number, length: number): void {
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
  }
}
