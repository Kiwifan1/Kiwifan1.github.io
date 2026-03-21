import { SPS } from './constants';

export class SPSModel {
  /**
   * Maximum input tank capacity (mB Polonium).
   * Defined as POL_PER_AM * 2 = 2000 mB.
   */
  public static readonly MAX_INPUT_CAPACITY = SPS.POL_PER_AM * 2;

  /** Target antimatter production rate in mB/t. */
  public readonly targetAntimatterRate: number;

  constructor(targetAntimatterRate: number) {
    if (targetAntimatterRate <= 0) {
      throw new RangeError(
        `targetAntimatterRate must be greater than 0, received ${targetAntimatterRate}`
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
