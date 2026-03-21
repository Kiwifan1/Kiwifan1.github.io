import { PRODUCTION_CHAIN } from './constants';
import { BatchMachine } from './BatchMachine';
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

export interface FlowRateMachineStage {
	type: 'flow';
	name: string;
	count: 1;
	flowRateMbPerTick: number;
	energyPerTick: number;
}

export type MachineStage = BatchMachineStage | FlowRateMachineStage;

export interface ResourceRates {
	uraniumIngotsPerTick: number;
	fluoritePerTick: number;
	coalPerTick: number;
	waterMbPerTick: number;
	totalEnergyPerTick: number;
}

export interface ProductionChainResult {
	targetFuelRate: number;
	speedUpgrades: number;
	stages: MachineStage[];
	resources: ResourceRates;
	totalMachines: number;
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

	constructor(targetFuelRate: number, speedUpgrades: number = 0) {
		FissileProductionChain.validateInputs(targetFuelRate, speedUpgrades);
		this.targetFuelRate = targetFuelRate;
		this.speedUpgrades = speedUpgrades;
	}

	/** Delegates to BatchMachine.computeEffectiveTicks for backward compat. */
	public static getEffectiveTicks(baseTicks: number, speedUpgrades: number): number {
		return BatchMachine.computeEffectiveTicks(baseTicks, speedUpgrades);
	}

	public calculate(): ProductionChainResult {
		const R = this.targetFuelRate;
		const u = this.speedUpgrades;
		const C = PRODUCTION_CHAIN;

		// --- Create machine instances ---
		const enrichment = createEnrichmentChamber(u);
		const oxidizerUO = createChemicalOxidizerUranium(u);
		const oxidizerSO2 = createChemicalOxidizerSulfur(u);
		const prc = createPressurizedReactionChamber(u);
		const dissolution = createDissolutionChamber(u);

		const infuserSO3 = createChemicalInfuserSO3();
		const condensentrator = createRotaryCondensentrator();
		const infuserH2SO4 = createChemicalInfuserH2SO4();
		const es = createElectrolyticSeparator();
		const infuserUF6 = createChemicalInfuserUF6();
		const centrifuge = createIsotopicCentrifuge();

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

		// --- Build flow stages ---
		const flowStages: FlowRateMachineStage[] = [
			buildFlowStage(infuserSO3, so3Needed, C.CHEMICAL_INFUSER_SO3),
			buildFlowStage(condensentrator, vaporNeeded, C.ROTARY_CONDENSENTRATOR),
			buildFlowStage(infuserH2SO4, h2so4Needed, C.CHEMICAL_INFUSER_H2SO4),
			buildFlowStage(es, totalO2, C.ELECTROLYTIC_SEPARATOR, 'O2'),
			buildFlowStage(infuserUF6, uf6Needed, C.CHEMICAL_INFUSER_UF6),
			buildFlowStage(centrifuge, R, C.ISOTOPIC_CENTRIFUGE),
		];

		const stages: MachineStage[] = [...batchStages, ...flowStages];

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
			totalMachines: stages.reduce((sum, s) => sum + s.count, 0),
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

interface FlowConstants {
	BASE_ENERGY: number;
	OUTPUT_MB?: number;
	OUTPUT_O2_MB?: number;
	OUTPUT_VAPOR_MB?: number;
}

function buildFlowStage(
	machine: { name: string },
	flowRate: number,
	constants: FlowConstants,
	outputKey: string = 'default'
): FlowRateMachineStage {
	return {
		type: 'flow',
		name: machine.name,
		count: 1,
		flowRateMbPerTick: flowRate,
		energyPerTick: constants.BASE_ENERGY,
	};
}
