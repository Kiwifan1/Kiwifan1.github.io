import { PRODUCTION_CHAIN } from './constants';

/**
 * A batch-processing Mekanism machine.
 * Processes one operation every `effectiveTicks` ticks.
 * Speed upgrades reduce ticks via: ceil(baseTicks × M^(-u/u_max))
 * where M = 10 (maxUpgradeMultiplier), u_max = 8.
 */
export class BatchMachine {
  public static readonly MAX_UPGRADE_MULTIPLIER = 10;
  public static readonly MAX_SPEED_UPGRADES = PRODUCTION_CHAIN.MAX_SPEED_UPGRADES;

  public readonly name: string;
  public readonly baseTicks: number;
  public readonly baseEnergy: number;
  public readonly speedUpgrades: number;
  public readonly effectiveTicks: number;

  constructor(name: string, baseTicks: number, baseEnergy: number, speedUpgrades: number = 0) {
    if (speedUpgrades < 0 || speedUpgrades > BatchMachine.MAX_SPEED_UPGRADES) {
      throw new Error(`Speed upgrades must be between 0 and ${BatchMachine.MAX_SPEED_UPGRADES}`);
    }
    if (!Number.isInteger(speedUpgrades)) {
      throw new Error('Speed upgrades must be an integer');
    }
    this.name = name;
    this.baseTicks = baseTicks;
    this.baseEnergy = baseEnergy;
    this.speedUpgrades = speedUpgrades;
    this.effectiveTicks = BatchMachine.computeEffectiveTicks(baseTicks, speedUpgrades);
  }

  /** Mekanism formula: ceil(baseTicks × M^(-fraction)) */
  public static computeEffectiveTicks(baseTicks: number, speedUpgrades: number): number {
    const fraction = speedUpgrades / BatchMachine.MAX_SPEED_UPGRADES;
    return Math.ceil(baseTicks * Math.pow(BatchMachine.MAX_UPGRADE_MULTIPLIER, -fraction));
  }

  /** Operations per tick for a single machine. */
  public getThroughput(): number {
    return 1 / this.effectiveTicks;
  }

  /** How many machines needed to sustain the given ops/tick. */
  public machinesNeeded(requiredOpsPerTick: number): number {
    if (requiredOpsPerTick <= 0) return 0;
    return Math.ceil(requiredOpsPerTick / this.getThroughput());
  }

  /** Total energy per tick for N machines of this type. */
  public energyPerTick(machineCount: number): number {
    return machineCount * this.baseEnergy / this.effectiveTicks;
  }
}
