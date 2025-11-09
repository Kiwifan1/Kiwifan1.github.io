import { ENERGY_PER_STEAM, STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';
import { ShellBreakdown } from './Shell';
import { create, all, MathNode } from 'mathjs';

const math = create(all);

export interface IndustrialTurbineCost {
  LowerShell: ShellBreakdown;
  Dispersers: {
    Amount: number;
    Offset: number;
  };
  Vents: number;
  Condensors: number;
  TurbineRotors: number;
  TurbineBlades: number;
  Coils: number;
  RotationalComplex: number;
}

export class IndustrialTurbine {
  public static MIN_LENGTH = 5;
  public static MIN_HEIGHT = 5;
  public static MAX_LENGTH = 17;
  public static MAX_HEIGHT = 18;
  public static VALVES = 3;
  public static MAX_BLADES = 28;

  length: number;
  height: number;
  interiorLength: number;
  interiorHeight: number;
  disperserOffset: number;

  constructor(length: number, height: number, disperserOffset: number) {
    if (length < IndustrialTurbine.MIN_LENGTH || length > IndustrialTurbine.MAX_LENGTH) {
      throw new Error(
        `Length must be between ${IndustrialTurbine.MIN_LENGTH} and ${IndustrialTurbine.MAX_LENGTH}`
      );
    }
    if (height < IndustrialTurbine.MIN_HEIGHT || height > IndustrialTurbine.MAX_HEIGHT) {
      throw new Error(
        `Height must be between ${IndustrialTurbine.MIN_HEIGHT} and ${IndustrialTurbine.MAX_HEIGHT}`
      );
    }

    if (disperserOffset < 2 || disperserOffset >= height - 1) {
      throw new Error(`Disperser offset must be between 2 and ${height - 1}`);
    }

    this.length = length;
    this.height = height;
    this.interiorLength = this.length - 2;
    this.interiorHeight = this.height - 2;
    this.disperserOffset = disperserOffset;
  }

  //#region Class Methods

  getVolume(): number {
    return this.length ** 2 * this.height;
  }

  getLowerHeight(): number {
    return Math.max(this.disperserOffset - 1, 0);
  }

  getUpperHeight(): number {
    return Math.max(this.height - this.disperserOffset, 0);
  }

  getLowerInteriorHeight(): number {
    return Math.max(this.disperserOffset - 2, 0);
  }

  getUpperInteriorHeight(): number {
    return Math.max(this.height - this.disperserOffset - 1, 0);
  }

  getLowerVolume(): number {
    return this.length ** 2 * this.getLowerHeight();
  }

  getUpperVolume(): number {
    return this.length ** 2 * this.getUpperHeight();
  }

  getDisperserVolume(): number {
    return this.length ** 2;
  }

  getLowerInteriorVolume(): number {
    const interiorLength = Math.max(this.interiorLength, 0);
    return interiorLength ** 2 * this.getLowerInteriorHeight();
  }

  getUpperInteriorVolume(): number {
    const interiorLength = Math.max(this.interiorLength, 0);
    return interiorLength ** 2 * this.getUpperInteriorHeight();
  }

  getDisperserInteriorVolume(): number {
    const interiorLength = Math.max(this.interiorLength, 0);
    return interiorLength ** 2;
  }

  getInteriorVolume(): number {
    if (this.interiorLength <= 0 || this.interiorHeight <= 0) {
      return 0;
    }
    return this.interiorLength ** 2 * this.interiorHeight;
  }

  getShellVolume(): number {
    return this.getVolume() - this.getInteriorVolume();
  }

  getLowerShellVolume(): number {
    return this.getLowerVolume() - this.getLowerInteriorVolume();
  }

  getUpperShellVolume(): number {
    return this.getUpperVolume() - this.getUpperInteriorVolume();
  }

  getDisperserShellVolume(): number {
    return this.getDisperserVolume() - this.getDisperserInteriorVolume();
  }

  //#endregion

  //#region Optimal Value Methods

  static getVentsPerSteamlayer(L: number): number {
    return 4 * (L - 2);
  }

  static getVentsForCeiling(L: number): number {
    return (L - 2) ** 2;
  }

  static getDisperserAmount(L: number): number {
    return (L - 2) ** 2 - 1; // Rotational Complex
  }

  static getSteamCapacityPerLayer(L: number): number {
    return TURBINE.CHEMICAL_PER_TANK * (L - 2) ** 2;
  }

  static getBladeRate(coilCount: number, bladeCount: number): number {
    return Math.min(
      bladeCount / IndustrialTurbine.MAX_BLADES,
      (coilCount * TURBINE.BLADES_PER_COIL) / IndustrialTurbine.MAX_BLADES
    );
  }

  static getVentFlow(ventCount: number): number {
    return ventCount * TURBINE.VENT_CHEMICAL_FLOW;
  }

  static getDisperserFlow(disperserCount: number): number {
    return disperserCount * TURBINE.DISPERSER_CHEMICAL_FLOW;
  }

  static getLowerVolume(L: number, rotorCount: number): number {
    return (L - 2) ** 2 * rotorCount;
  }

  static getSteamFlow(L: number, disperserCount: number, rotorCount: number): number {
    return (
      IndustrialTurbine.getLowerVolume(L, rotorCount) *
      IndustrialTurbine.getDisperserFlow(disperserCount)
    );
  }

  static getSteamStorage(L: number, rotorCount: number): number {
    return L ** 2 * rotorCount * TURBINE.CHEMICAL_PER_TANK;
  }

  static getEnergyStorage(L: number, H: number): number {
    return L ** 2 * H * TURBINE.ENERGY_CAPACITY_PER_VOLUME;
  }

  static getWaterFlow(condenserCount: number): number {
    return condenserCount * TURBINE.CONDENSER_RATE;
  }

  static getWaterPipeCount(waterFlow: number): number {
    return Math.ceil(waterFlow / WATER_PIPE.RATE);
  }

  static getSteamPipeCount(steamFlow: number): number {
    return Math.ceil(steamFlow / STEAM_PIPE.RATE);
  }

  static getEnergyProduction(BladeRate: number, steamFlow: number): number {
    return BladeRate * steamFlow * TURBINE.ENERGY_CAPACITY_PER_VOLUME;
  }

  static getMaxFlow(
    L: number,
    rotorCount: number,
    ventCount: number,
    disperserCount: number
  ): number {
    const steamFlow = IndustrialTurbine.getSteamFlow(L, disperserCount, rotorCount);
    const ventFlow = IndustrialTurbine.getVentFlow(ventCount);
    return Math.min(ventFlow, steamFlow);
  }

  static getOptimalDisperserOffset(L: number, H: number): number {
    /** r = rotorCount, 
        s = height above dispersers, 
        h = (H - 2) height of interior
        m = TURBINE.VENT_CHEMICAL_FLOW
        n = TURBINE.DISPERSER_CHEMICAL_FLOW
        p = IndustrialTurbine.MAX_BLADES
        q = TURBINE.BLADES_PER_COIL
        e = ENERGY_PER_STEAM
    
    /* r + s + 1 = h

    /* F_{max} = e * F_{blade} * F_{steamMax}
    /* F_{SteamMax} = Min(SteamFlowMax(vent), SteamFlowMax(disperser))
    /* F_{blade} = Min(BladeNumRate, CoilBladeRate)
    /* N_{vent} = getVentsForCeiling(L) + (getVentsPerSteamlayer(L) * (h - r - 1))

    /* SteamFlowMax(vent) = m * N_{vent} 
     * Let 
        =>   m * getVentsForCeiling(L) + (getVentsPerSteamlayer(L) * (h - r - 1))
        =>   m * (L - 2)^2) + ((L - 2) * 4) * (h - r - 1))
        =>   m * (L - 2)^2) + (4(L - 2)(h - r - 1))
        => 

    /* SteamFlowMax(disperser) = getSteamFlow(L, disperserCount, r)
        =>  n * N_{disperser} * ((L - 2)^2 * r)
        =>  ... * ((L - 2)^2 - 1) * ((L - 2)^2 * r)

    /* F_{blade} = min(getBladeNumRate(b), getCoilBladeRate(c))
    /*   b = 2r (two blades per rotor)
    /*   c = (2 * r) / q (# coils to support blades)

       bladeNumRate = 2r / p
       coilBladeRate = (c * q) / p
         => ((2 * r) / q) * q / p
         => 2r / p

       => F_{blade} = 2r / p

    /* F_{max} = e * F_{blade} * F_{steamMax}
         => e * (2r / p) * F_{steamMax}
    **/

    // define symbolic variables

    const k = ENERGY_PER_STEAM;
    const h = H - 2;
    const m = TURBINE.VENT_CHEMICAL_FLOW;
    const n = TURBINE.DISPERSER_CHEMICAL_FLOW;
    const p = IndustrialTurbine.MAX_BLADES;
    const r = math.parse('r');

    let a = 0, b = 0, c = 0;
    return -1;
  }

  //#endregion
}
