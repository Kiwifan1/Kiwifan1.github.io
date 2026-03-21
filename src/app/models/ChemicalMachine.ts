import { ProcessingMachine } from './ProcessingMachine';

/**
 * A chemical-processing Mekanism machine.
 *
 * These machines process chemicals at per-mB ratios. Their throughput is:
 *   throughputPerTick = totalOutputMb × 2^speedUpgrades
 *
 * Speed upgrades double throughput per upgrade (exponential).
 * Energy per tick: baseEnergy × 10^(2s) where s = speedUpgrades/8.
 */
export class ChemicalMachine implements ProcessingMachine {
	public static readonly MAX_SPEED_UPGRADES = 8;

	public readonly name: string;
	public readonly inputs: ReadonlyMap<string, number>;
	public readonly outputs: ReadonlyMap<string, number>;
	public readonly baseEnergy: number;
	public readonly speedUpgrades: number;
	public readonly energyUpgrades: number;
	public readonly gasUpgrades: number;
	public readonly supportsGasUpgrade: boolean;

	/**
	 * Gas usage multiplier: 10^(2s - g) for gas-supporting machines, 10^(s) otherwise.
	 * This multiplies the input consumption rate per tick.
	 * At max speed (8) + max gas (8): 10^(2-1) = 10× base consumption/tick.
	 * At max speed (8) + no gas: 10^(2) = 100× base consumption/tick.
	 * Since throughput also scales, net effect on resource/output is 10^(s-g) for gas machines.
	 */
	public readonly gasUsageMultiplier: number;

	/** Total output mB per recipe operation (sum of all outputs). */
	public readonly recipeOutputMb: number;

	/** mB of output per tick for a single machine. */
	public readonly throughputPerTick: number;

	constructor(
		name: string,
		inputs: Record<string, number>,
		outputs: Record<string, number>,
		baseEnergy: number,
		speedUpgrades: number = 0,
		supportsGasUpgrade: boolean = false,
		energyUpgrades: number = 0,
		gasUpgrades: number = 0
	) {
		if (speedUpgrades < 0 || speedUpgrades > ChemicalMachine.MAX_SPEED_UPGRADES) {
			throw new Error(`Speed upgrades must be between 0 and ${ChemicalMachine.MAX_SPEED_UPGRADES}`);
		}
		this.name = name;
		this.inputs = new Map(Object.entries(inputs));
		this.outputs = new Map(Object.entries(outputs));
		this.baseEnergy = baseEnergy;
		this.speedUpgrades = speedUpgrades;
		this.energyUpgrades = energyUpgrades;
		this.gasUpgrades = gasUpgrades;
		this.supportsGasUpgrade = supportsGasUpgrade;

		const s = speedUpgrades / ChemicalMachine.MAX_SPEED_UPGRADES;
		const g = supportsGasUpgrade ? gasUpgrades / ChemicalMachine.MAX_SPEED_UPGRADES : 0;
		this.gasUsageMultiplier = supportsGasUpgrade
			? Math.pow(10, 2 * s - g)
			: Math.pow(10, s);

		// Total output per recipe = sum of all output mB
		this.recipeOutputMb = Object.values(outputs).reduce((sum, v) => sum + v, 0);

		// Throughput = recipeOutputMb × 2^speedUpgrades
		this.throughputPerTick = this.recipeOutputMb * Math.pow(2, speedUpgrades);
	}

	/** How many machines needed to sustain the given mB/t of the primary output. */
	public machinesNeeded(requiredMbPerTick: number): number {
		if (requiredMbPerTick <= 0) return 0;
		return Math.ceil(requiredMbPerTick / this.throughputPerTick);
	}

	/** Energy per tick for N machines. Formula: baseEnergy × 10^(2s - e) per machine. */
	public energyPerTick(machineCount: number): number {
		const s = this.speedUpgrades / ChemicalMachine.MAX_SPEED_UPGRADES;
		const e = this.energyUpgrades / ChemicalMachine.MAX_SPEED_UPGRADES;
		return machineCount * this.baseEnergy * Math.pow(10, 2 * s - e);
	}

	/**
	 * Given a required output rate (mB/t), compute the input rate for a specific input.
	 * Uses stoichiometric ratios — gas upgrades don't change the chemistry,
	 * they reduce waste/overconsumption from speed penalties.
	 */
	public getInputRate(outputName: string, outputRate: number, inputName: string): number {
		const outputRatio = this.outputs.get(outputName);
		const inputRatio = this.inputs.get(inputName);
		if (outputRatio === undefined) throw new Error(`Unknown output: ${outputName}`);
		if (inputRatio === undefined) throw new Error(`Unknown input: ${inputName}`);
		return (outputRate / outputRatio) * inputRatio;
	}

	/** Given a required input rate (mB/t), compute the output rate for a specific output. */
	public getOutputRate(inputName: string, inputRate: number, outputName: string): number {
		const inputRatio = this.inputs.get(inputName);
		const outputRatio = this.outputs.get(outputName);
		if (inputRatio === undefined) throw new Error(`Unknown input: ${inputName}`);
		if (outputRatio === undefined) throw new Error(`Unknown output: ${outputName}`);
		return (inputRate / inputRatio) * outputRatio;
	}
}
