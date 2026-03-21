import { PRODUCTION_CHAIN } from './constants';
import { BatchMachine } from './BatchMachine';
import { ChemicalMachine } from './ChemicalMachine';
import {
	createEnrichmentChamber,
	createChemicalOxidizerUranium,
	createChemicalOxidizerSulfur,
	createPressurizedReactionChamber,
	createDissolutionChamber,
	createChemicalInfuserSO3,
	createRotaryCondensentrator,
	createChemicalInfuserH2SO4,
	createElectrolyticSeparator,
	createChemicalInfuserUF6,
	createIsotopicCentrifuge,
} from './machines';

export interface BatchMachineStage {
	type: 'batch';
	name: string;
	count: number;
	opsPerTick: number;
	ticksPerOp: number;
	energyPerTick: number;
}

export interface ChemicalMachineStage {
	type: 'chemical';
	name: string;
	count: number;
	throughputPerTick: number;
	flowRateMbPerTick: number;
	energyPerTick: number;
	supportsGasUpgrade: boolean;
}

export type MachineStage = BatchMachineStage | ChemicalMachineStage;

export interface ResourceRates {
	uraniumIngotsPerTick: number;
	fluoritePerTick: number;
	coalPerTick: number;
	waterMbPerTick: number;
	totalEnergyPerTick: number;
}

export interface UpgradeRequirements {
	speed: { perMachine: number; machines: number; total: number };
	energy: { perMachine: number; machines: number; total: number };
	gas: { perMachine: number; machines: number; total: number };
}

export interface ProductionChainResult {
	targetFuelRate: number;
	speedUpgrades: number;
	stages: MachineStage[];
	resources: ResourceRates;
	totalMachines: number;
	upgradeRequirements: UpgradeRequirements;
}

/**
 * Composes individual machine models to calculate the full fissile fuel
 * production chain requirements for a target burn rate.
 */
export class FissileProductionChain {
	public static readonly MIN_FUEL_RATE = 0.1;
	public static readonly MAX_FUEL_RATE = 10000;
	public static readonly MAX_SPEED_UPGRADES = PRODUCTION_CHAIN.MAX_SPEED_UPGRADES;

	public readonly targetFuelRate: number;
	public readonly speedUpgrades: number;
	public readonly energyUpgrades: number;
	public readonly gasUpgrades: number;

	constructor(targetFuelRate: number, speedUpgrades: number = 0, energyUpgrades: number = 0, gasUpgrades: number = 0) {
		FissileProductionChain.validateInputs(targetFuelRate, speedUpgrades);
		this.targetFuelRate = targetFuelRate;
		this.speedUpgrades = speedUpgrades;
		this.energyUpgrades = energyUpgrades;
		this.gasUpgrades = gasUpgrades;
	}

	/** Delegates to BatchMachine.computeEffectiveTicks for backward compat. */
	public static getEffectiveTicks(baseTicks: number, speedUpgrades: number): number {
		return BatchMachine.computeEffectiveTicks(baseTicks, speedUpgrades);
	}

	public calculate(): ProductionChainResult {
		const R = this.targetFuelRate;
		const u = this.speedUpgrades;
		const e = this.energyUpgrades;
		const g = this.gasUpgrades;
		const C = PRODUCTION_CHAIN;

		// --- Create machine instances (all receive speed + energy + gas upgrades) ---
		const enrichment = createEnrichmentChamber(u, e);
		const oxidizerUO = createChemicalOxidizerUranium(u, e);
		const oxidizerSO2 = createChemicalOxidizerSulfur(u, e);
		const prc = createPressurizedReactionChamber(u, e);
		const dissolution = createDissolutionChamber(u, e);

		const infuserSO3 = createChemicalInfuserSO3(u, e, g);
		const condensentrator = createRotaryCondensentrator(u, e, g);
		const infuserH2SO4 = createChemicalInfuserH2SO4(u, e, g);
		const es = createElectrolyticSeparator(u, e, g);
		const infuserUF6 = createChemicalInfuserUF6(u, e, g);
		const centrifuge = createIsotopicCentrifuge(u, e, g);

		// --- Backward demand calculation from R mB/t Fissile Fuel ---

		// Centrifuge: 1 UF6 -> 1 Fuel (1:1)
		const uf6Needed = R;

		// UF6 Infuser: 1 HF + 1 UO -> 2 UF6
		const hfNeeded = infuserUF6.getInputRate('UF6', uf6Needed, 'HF');
		const uoNeeded = infuserUF6.getInputRate('UF6', uf6Needed, 'UO');

		// Path A: Uranium Oxide
		const oxUOps = uoNeeded / C.CHEMICAL_OXIDIZER_URANIUM.OUTPUT_MB;
		const ecOps = oxUOps / C.ENRICHMENT_CHAMBER.OUTPUT_COUNT;

		// Path B: Hydrofluoric Acid
		const dcOps = hfNeeded / C.DISSOLUTION_CHAMBER.OUTPUT_MB;
		const h2so4Needed = dcOps * C.DISSOLUTION_CHAMBER.INPUT_H2SO4_MB;

		const so3Needed = infuserH2SO4.getInputRate('H2SO4', h2so4Needed, 'SO3');
		const vaporNeeded = infuserH2SO4.getInputRate('H2SO4', h2so4Needed, 'WaterVapor');

		const so2Needed = infuserSO3.getInputRate('SO3', so3Needed, 'SO2');
		const o2ForSO3 = infuserSO3.getInputRate('SO3', so3Needed, 'O2');

		const oxSOps = so2Needed / C.CHEMICAL_OXIDIZER_SULFUR.OUTPUT_MB;
		const prcOps = oxSOps;

		// Oxygen: PRC + SO3
		const o2ForPRC = prcOps * C.PRESSURIZED_REACTION_CHAMBER.INPUT_OXYGEN_MB;
		const totalO2 = o2ForPRC + o2ForSO3;

		// ES water for O2 production
		const esWater = es.getInputRate('O2', totalO2, 'Water');

		// Condensentrator water
		const rcWater = condensentrator.getInputRate('WaterVapor', vaporNeeded, 'Water');

		// PRC water
		const prcWater = prcOps * C.PRESSURIZED_REACTION_CHAMBER.INPUT_WATER_MB;

		const totalWater = prcWater + rcWater + esWater;

		// --- Build batch stages using machine models ---
		const batchStages: BatchMachineStage[] = [
			buildBatchStage(enrichment, ecOps),
			buildBatchStage(oxidizerUO, oxUOps),
			buildBatchStage(prc, prcOps),
			buildBatchStage(oxidizerSO2, oxSOps),
			buildBatchStage(dissolution, dcOps),
		];

		// --- Build chemical stages ---
		const chemicalStages: ChemicalMachineStage[] = [
			buildChemicalStage(infuserSO3, so3Needed),
			buildChemicalStage(condensentrator, vaporNeeded),
			buildChemicalStage(infuserH2SO4, h2so4Needed),
			buildChemicalStageForOutput(es, totalO2, 'O2'),
			buildChemicalStage(infuserUF6, uf6Needed),
			buildChemicalStage(centrifuge, R),
		];

		const stages: MachineStage[] = [...batchStages, ...chemicalStages];

		const totalMachines = stages.reduce((sum, s) => sum + s.count, 0);

		const chemicalMachineCount = stages
			.filter(s => s.type === 'chemical')
			.reduce((sum, s) => sum + s.count, 0);

		const upgradeRequirements: UpgradeRequirements = {
			speed: {
				perMachine: this.speedUpgrades,
				machines: totalMachines,
				total: this.speedUpgrades * totalMachines,
			},
			energy: {
				perMachine: this.energyUpgrades,
				machines: totalMachines,
				total: this.energyUpgrades * totalMachines,
			},
			gas: {
				perMachine: this.gasUpgrades,
				machines: chemicalMachineCount,
				total: this.gasUpgrades * chemicalMachineCount,
			},
		};

		const resources: ResourceRates = {
			uraniumIngotsPerTick: ecOps,
			fluoritePerTick: dcOps,
			coalPerTick: prcOps,
			waterMbPerTick: totalWater,
			totalEnergyPerTick: stages.reduce((sum, s) => sum + s.energyPerTick, 0),
		};

		return {
			targetFuelRate: this.targetFuelRate,
			speedUpgrades: this.speedUpgrades,
			stages,
			resources,
			totalMachines,
			upgradeRequirements,
		};
	}

	private static validateInputs(targetFuelRate: number, speedUpgrades: number): void {
		if (targetFuelRate < FissileProductionChain.MIN_FUEL_RATE || targetFuelRate > FissileProductionChain.MAX_FUEL_RATE) {
			throw new Error(
				`Target fuel rate must be between ${FissileProductionChain.MIN_FUEL_RATE} and ${FissileProductionChain.MAX_FUEL_RATE}`
			);
		}
		if (speedUpgrades < 0 || speedUpgrades > FissileProductionChain.MAX_SPEED_UPGRADES) {
			throw new Error(
				`Speed upgrades must be between 0 and ${FissileProductionChain.MAX_SPEED_UPGRADES}`
			);
		}
		if (!Number.isInteger(speedUpgrades)) {
			throw new Error('Speed upgrades must be an integer');
		}
	}
}

function buildBatchStage(machine: BatchMachine, requiredOps: number): BatchMachineStage {
	const count = machine.machinesNeeded(requiredOps);
	return {
		type: 'batch',
		name: machine.name,
		count,
		opsPerTick: requiredOps,
		ticksPerOp: machine.effectiveTicks,
		energyPerTick: machine.energyPerTick(count),
	};
}

/**
 * Build a chemical stage where `requiredMbPerTick` is the total output demand
 * and the machine has a single primary output (or we care about total throughput).
 */
function buildChemicalStage(machine: ChemicalMachine, requiredMbPerTick: number): ChemicalMachineStage {
	const count = machine.machinesNeeded(requiredMbPerTick);
	return {
		type: 'chemical',
		name: machine.name,
		count,
		throughputPerTick: machine.throughputPerTick,
		flowRateMbPerTick: requiredMbPerTick,
		energyPerTick: machine.energyPerTick(count),
		supportsGasUpgrade: machine.supportsGasUpgrade,
	};
}

/**
 * Build a chemical stage for a machine with multiple outputs, where we need
 * a specific output at `requiredMbPerTick`. Machine count is based on that
 * specific output's per-recipe ratio, not total throughput.
 *
 * Example: Electrolytic Separator outputs 1 mB O2 + 2 mB H2 per operation.
 * If we need X mB/t of O2, machines = ceil(X / (O2_per_recipe * 2^speed)).
 */
function buildChemicalStageForOutput(
	machine: ChemicalMachine,
	requiredMbPerTick: number,
	outputName: string
): ChemicalMachineStage {
	const outputPerRecipe = machine.outputs.get(outputName);
	if (outputPerRecipe === undefined) {
		throw new Error(`Unknown output "${outputName}" on machine "${machine.name}"`);
	}
	const perMachineRate = outputPerRecipe * Math.pow(2, machine.speedUpgrades);
	const count = requiredMbPerTick <= 0 ? 0 : Math.ceil(requiredMbPerTick / perMachineRate);
	return {
		type: 'chemical',
		name: machine.name,
		count,
		throughputPerTick: machine.throughputPerTick,
		flowRateMbPerTick: requiredMbPerTick,
		energyPerTick: machine.energyPerTick(count),
		supportsGasUpgrade: machine.supportsGasUpgrade,
	};
}
