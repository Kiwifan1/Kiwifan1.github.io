import { SPS } from './constants';

export class SPSModel {
  /**
   * Maximum input tank capacity (mB Polonium).
   * Defined as POL_PER_AM * 2 = 2000 mB.
   */
  public static readonly MAX_INPUT_CAPACITY = SPS.POL_PER_AM * 2;

  /** Maximum antimatter production rate (mB/t). Hardware-capped at 2 mB/t. */
  public static readonly MAX_ANTIMATTER_RATE = 2;

  /** Maximum energy the SPS can accept (FE/t). 800 MFE/t via 2 ports at 400 MFE/t each. */
  public static readonly MAX_ENERGY_INPUT = 800_000_000;

  /** Target antimatter production rate in mB/t. */
  public readonly targetAntimatterRate: number;

  constructor(targetAntimatterRate: number) {
    if (targetAntimatterRate <= 0) {
      throw new RangeError(
        `targetAntimatterRate must be greater than 0, received ${targetAntimatterRate}`
      );
    }
    if (targetAntimatterRate > SPSModel.MAX_ANTIMATTER_RATE) {
      throw new RangeError(
        `targetAntimatterRate cannot exceed ${SPSModel.MAX_ANTIMATTER_RATE} mB/t (hardware cap)`
      );
    }
    this.targetAntimatterRate = targetAntimatterRate;
  }

  /**
   * Polonium consumed per tick (mB/t).
   *
   * poloniumDemand = targetAntimatterRate * POL_PER_AM
   */
  getPoloniumDemand(): number {
    return this.targetAntimatterRate * SPS.POL_PER_AM;
  }

  /**
   * Energy required per tick (J/t).
   *
   * energyDemand = poloniumDemand * ENERGY_PER_INPUT
   */
  getEnergyDemand(): number {
    return this.getPoloniumDemand() * SPS.ENERGY_PER_INPUT;
  }

  /**
   * Input tank capacity for Polonium (mB).
   */
  getInputCapacity(): number {
    return SPSModel.MAX_INPUT_CAPACITY;
  }

  /**
   * Output tank capacity for Antimatter (mB).
   */
  getOutputCapacity(): number {
    return SPS.OUTPUT_CAPACITY;
  }
}
