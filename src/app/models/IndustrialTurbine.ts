import { ENERGY_PER_STEAM, STEAM_PIPE, TURBINE, WATER_PIPE } from './constants';
import { ShellBreakdown } from './Shell';
import { create, all, parse, simplify, derivative, evaluate, zeros } from 'mathjs';

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

    if (disperserOffset < 2 || disperserOffset > height - 1) {
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
    
    /* r + s + 1 (disperser layer) = h

    /* F_{max} = ENERGY_PER_STEAM * F_{blade} * F_{steamMax}
    /* F_{SteamMax} = Min(SteamFlowMax(vent), SteamFlowMax(disperser))
    /* F_{blade} = Min(BladeNumRate, CoilBladeRate)
    /* N_{vent} = getVentsPerSteamlayer(L) * (h - r - 1) + getVentsForCeiling(L)

    /* SteamFlowMax(vent) = TURBINE.VENT_CHEMICAL_FLOW * N_{vent} 
        =>   TURBINE.VENT_CHEMICAL_FLOW * (getVentsForCeiling(L) + getVentsPerSteamlayer(L) * (h - r - 1))
        =>   ... * ((L - 2) * 4) * (h - r - 1) + ((L - 2)^2)
        =>   ... * (4(L - 2)(h - r - 1) + (L - 2)^2)

    /* SteamFlowMax(disperser) = getSteamFlow(L, disperserCount, r)
        =>  TURBINE.DISPERSER_CHEMICAL_FLOW * N_{disperser} * ((L - 2)^2 * r)
        =>  ... * ((L - 2)^2 - 1) * ((L - 2)^2 * r)

    /* F_{blade} = min(getBladeNumRate(b), getCoilBladeRate(c))
    /*   b = 2r (two blades per rotor)
    /*   c = (2 * r) / TURBINE.BLADES_PER_COIL (# coils to support blades)
    
       bladeNumRate = 2r / MAX_BLADES
       coilBladeRate = (c * TURBINE.BLADES_PER_COIL) / MAX_BLADES
         => ((2 * r) / TURBINE.BLADES_PER_COIL) * TURBINE.BLADES_PER_COIL / MAX_BLADES
         => 2r / MAX_BLADES

       => F_{blade} = 2r / MAX_BLADES

    /* F_{max} = ENERGY_PER_STEAM * F_{blade} * F_{steamMax}
         => ENERGY_PER_STEAM * (2r / MAX_BLADES) * F_{steamMax}

    /* Will Result in a quadratic equation in terms of r, one of the following:
     * For ease of writing, let: ENERGY_PER_STEAM = k, 
        and TURBINE.VENT_CHEMICAL_FLOW = m, 
        and TURBINE.DISPERSER_CHEMICAL_FLOW = n
        and MAX_BLADES = p

        => k * (2r / p) * (m * (4(L - 2)(h - r - 1) + (L - 2)^2))
        => k * (2r / p) * (m * (4(Lh - Lr - L - 2h + 2r + 2) + L^2 - 4L + 4))
        => k * (2r / p) * (m * (4Lh - 4Lr - 4L - 8h + 8r + 8 + L^2 - 4L + 4))
        => k * (2r / p) * (m * (L^2 +4Lh - 4Lr - 8h + 8r - 8L + 12))
        => ((2 * k * m * r) / p) * (L^2 +4Lh - 4Lr - 8h + 8r - 8L + 12)
        or
        * Let A = (L - 2)^2
        => k * (2r / p) * (n * (A - 1) * A * r)
        => ((2 * k * n) / p) * r * (A - 1) * A * r
        => ((2 * k * n) / p) * r^2 * (A - 1) * A
        => ((2 * k * n) / p) * r^2 * (A^2 - A)
        => ((2 * k * n) / p) * r^2 * ((L - 2)^4 - (L - 2)^2)
    /*

    /* To find optimal r, take derivative and find root (then take ceiling)
    r = ceil(derivative(F_{max}, r) = 0)
    s = h - r - 1

    N_{vent} = getVentsPerSteamlayer(L) * s + getVentsForCeiling(L)
    N_{condensors} = F_{max} / TURBINE.CONDENSER_RATE
    N_{coil} = (2 * r) / TURBINE.BLADES_PER_COIL
    **/

    // define symbolic variables

    const k = ENERGY_PER_STEAM;
    const h = H - 2;
    const m = TURBINE.VENT_CHEMICAL_FLOW;
    const n = TURBINE.DISPERSER_CHEMICAL_FLOW;
    const p = IndustrialTurbine.MAX_BLADES;
    const r = math.parse('r');

    const vent_limiting_expr = math.simplify(math.parse(
      `((${2 * k * m} * r) / ${p}) * (${4 * (L - 2)} * (${h} - r - 1) + ${(L - 2) ** 2})`
    ));

    const disperser_limiting_expr = math.simplify(math.parse(
      `(${2 * k * n} / ${p}) * r ** 2 * (${(L - 2) ** 4} - ${(L - 2) ** 2})`
    ));


    return -1;
  }

  //#endregion
}

IndustrialTurbine.getOptimalDisperserOffset(10, 10);