import { PRODUCTION_CHAIN } from './constants';

/**
 * Represents a batch machine (has BASE_TICKS, affected by speed upgrades).
 * Machine count = ceil(required_ops_per_tick / (1 / effective_ticks)).
 */
export interface BatchMachineStage {
	type: 'batch';
	name: string;
	count: number;
	opsPerTick: number;
	ticksPerOp: number;
	energyPerTick: number;
}

/**
 * Represents a flow-rate machine (per-mB ratio, no BASE_TICKS).
 * These process chemicals at a configurable throughput rate and scale with
 * pipe throughput, not machine count. Count is always 1.
 */
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

	/**
	 * Returns the effective ticks per operation for a batch machine after
	 * applying speed upgrades.
	 */
	public static getEffectiveTicks(baseTicks: number, speedUpgrades: number): number {
		return Math.ceil(baseTicks / (1 + speedUpgrades));
	}

	/**
	 * Returns how many operations per tick a single batch machine can perform.
	 */
	public static batchThroughput(baseTicks: number, speedUpgrades: number): number {
		return 1 / FissileProductionChain.getEffectiveTicks(baseTicks, speedUpgrades);
	}

	/**
	 * Returns ceil(requiredOpsPerTick / throughputPerMachine).
	 */
	public static machinesNeeded(requiredOpsPerTick: number, throughputPerMachine: number): number {
		if (requiredOpsPerTick <= 0) return 0;
		return Math.ceil(requiredOpsPerTick / throughputPerMachine);
	}

	public calculate(): ProductionChainResult {
		const R = this.targetFuelRate;
		const upgrades = this.speedUpgrades;

		const EC = PRODUCTION_CHAIN.ENRICHMENT_CHAMBER;
		const OX_U = PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_URANIUM;
		const ES = PRODUCTION_CHAIN.ELECTROLYTIC_SEPARATOR;
		const PRC = PRODUCTION_CHAIN.PRESSURIZED_REACTION_CHAMBER;
		const OX_S = PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_SULFUR;
		const CI_SO3 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_SO3;
		const RC = PRODUCTION_CHAIN.ROTARY_CONDENSENTRATOR;
		const CI_H2SO4 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_H2SO4;
		const DC = PRODUCTION_CHAIN.DISSOLUTION_CHAMBER;
		const CI_UF6 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_UF6;
		const IC = PRODUCTION_CHAIN.ISOTOPIC_CENTRIFUGE;

		// =============================================================
		// Backward calculation from R mB/t Fissile Fuel
		// =============================================================

		// 1. Isotopic Centrifuge: 1 UF6 -> 1 Fissile Fuel (1:1)
		//    Needs R mB/t UF6
		const uf6Needed = R; // mB/t

		// 2. UF6 Infuser: 1 HF + 1 UO -> 2 UF6
		//    Needs R/2 mB/t HF and R/2 mB/t UO
		const hfNeeded = R / 2;  // mB/t
		const uoNeeded = R / 2;  // mB/t

		// --- Path A: Uranium Oxide ---
		// 3. Chemical Oxidizer (UO): 1 Yellow Cake -> 250 mB UO
		//    Needs R/2 / 250 = R/500 yellow cake/t (ops/t)
		const oxUOpsPerTick = uoNeeded / OX_U.OUTPUT_MB; // R/500

		// 4. Enrichment Chamber: 1 Ingot -> 2 Yellow Cake
		//    Needs R/500 / 2 = R/1000 ingots/t (ops/t)
		const ecOpsPerTick = oxUOpsPerTick / EC.OUTPUT_COUNT; // R/1000

		// --- Path B: Hydrofluoric Acid ---
		// 5. Dissolution Chamber: 1 Fluorite + 1 mB H2SO4 -> 1000 mB HF
		//    Needs R/2 / 1000 = R/2000 fluorite/t (ops/t), R/2000 mB/t H2SO4
		const dcOpsPerTick = hfNeeded / DC.OUTPUT_MB; // R/2000
		const h2so4Needed = dcOpsPerTick * DC.INPUT_H2SO4_MB; // R/2000 mB/t

		// 6. H2SO4 Infuser: 1 SO3 + 1 Vapor -> 1 H2SO4
		//    Needs R/2000 mB/t SO3 and R/2000 mB/t Water Vapor
		const so3Needed = h2so4Needed; // R/2000 mB/t
		const waterVaporNeeded = h2so4Needed; // R/2000 mB/t

		// 7. SO3 Infuser: 2 SO2 + 1 O2 -> 2 SO3
		//    Needs R/2000 mB/t SO2 and R/4000 mB/t O2
		const so2Needed = so3Needed; // R/2000 mB/t (2:2 ratio)
		const o2ForSO3 = so3Needed / (CI_SO3.OUTPUT_MB / CI_SO3.INPUT_O2_MB); // R/4000 mB/t

		// 8. Sulfur Oxidizer: 1 Sulfur -> 100 mB SO2
		//    Needs R/2000 / 100 = R/200000 sulfur/t (ops/t)
		const oxSOpsPerTick = so2Needed / OX_S.OUTPUT_MB; // R/200000

		// 9. PRC: 1 Coal + 100 Water + 100 O2 -> 1 Sulfur + 100 H2
		//    Needs R/200000 ops/t
		const prcOpsPerTick = oxSOpsPerTick; // R/200000

		// --- Oxygen ---
		// PRC O2: R/200000 * 100 = R/2000 mB/t
		// SO3 O2: R/4000 mB/t
		// Total O2: R/2000 + R/4000 = 3R/4000 mB/t
		const o2ForPRC = prcOpsPerTick * PRC.INPUT_OXYGEN_MB; // R/2000
		const totalO2Needed = o2ForPRC + o2ForSO3; // 3R/4000

		// Electrolytic Separator: 2 Water -> 1 O2
		// Water for ES: 3R/4000 * 2 = 3R/2000 mB/t
		const esWaterNeeded = totalO2Needed * (ES.INPUT_WATER_MB / ES.OUTPUT_O2_MB); // 3R/2000

		// --- Condensentrator ---
		// Water Vapor needed: R/2000 mB/t -> Water input: R/2000 mB/t (1:1)
		const rcWaterNeeded = waterVaporNeeded * (RC.INPUT_WATER_MB / RC.OUTPUT_VAPOR_MB); // R/2000

		// --- PRC Water ---
		const prcWaterNeeded = prcOpsPerTick * PRC.INPUT_WATER_MB; // R/2000

		// --- Total Water ---
		// PRC (R/2000) + Condensentrator (R/2000) + ES (3R/2000) = 5R/2000 = R/400
		const totalWater = prcWaterNeeded + rcWaterNeeded + esWaterNeeded; // R/400

		// =============================================================
		// Build stages
		// =============================================================

		// --- Batch machines: need machine count calculation ---

		// Enrichment Chamber
		const ecEffTicks = FissileProductionChain.getEffectiveTicks(EC.BASE_TICKS, upgrades);
		const ecThroughput = FissileProductionChain.batchThroughput(EC.BASE_TICKS, upgrades);
		const ecCount = FissileProductionChain.machinesNeeded(ecOpsPerTick, ecThroughput);
		const ecStage: BatchMachineStage = {
			type: 'batch',
			name: 'Enrichment Chamber',
			count: ecCount,
			opsPerTick: ecOpsPerTick,
			ticksPerOp: ecEffTicks,
			energyPerTick: ecCount * EC.BASE_ENERGY / ecEffTicks,
		};

		// Chemical Oxidizer (Uranium Oxide)
		const oxUEffTicks = FissileProductionChain.getEffectiveTicks(OX_U.BASE_TICKS, upgrades);
		const oxUThroughput = FissileProductionChain.batchThroughput(OX_U.BASE_TICKS, upgrades);
		const oxUCount = FissileProductionChain.machinesNeeded(oxUOpsPerTick, oxUThroughput);
		const oxUStage: BatchMachineStage = {
			type: 'batch',
			name: 'Chemical Oxidizer (Uranium Oxide)',
			count: oxUCount,
			opsPerTick: oxUOpsPerTick,
			ticksPerOp: oxUEffTicks,
			energyPerTick: oxUCount * OX_U.BASE_ENERGY / oxUEffTicks,
		};

		// Chemical Oxidizer (Sulfur Dioxide)
		const oxSEffTicks = FissileProductionChain.getEffectiveTicks(OX_S.BASE_TICKS, upgrades);
		const oxSThroughput = FissileProductionChain.batchThroughput(OX_S.BASE_TICKS, upgrades);
		const oxSCount = FissileProductionChain.machinesNeeded(oxSOpsPerTick, oxSThroughput);
		const oxSStage: BatchMachineStage = {
			type: 'batch',
			name: 'Chemical Oxidizer (Sulfur Dioxide)',
			count: oxSCount,
			opsPerTick: oxSOpsPerTick,
			ticksPerOp: oxSEffTicks,
			energyPerTick: oxSCount * OX_S.BASE_ENERGY / oxSEffTicks,
		};

		// Pressurized Reaction Chamber
		const prcEffTicks = FissileProductionChain.getEffectiveTicks(PRC.BASE_TICKS, upgrades);
		const prcThroughput = FissileProductionChain.batchThroughput(PRC.BASE_TICKS, upgrades);
		const prcCount = FissileProductionChain.machinesNeeded(prcOpsPerTick, prcThroughput);
		const prcStage: BatchMachineStage = {
			type: 'batch',
			name: 'Pressurized Reaction Chamber',
			count: prcCount,
			opsPerTick: prcOpsPerTick,
			ticksPerOp: prcEffTicks,
			energyPerTick: prcCount * PRC.BASE_ENERGY / prcEffTicks,
		};

		// Dissolution Chamber
		const dcEffTicks = FissileProductionChain.getEffectiveTicks(DC.BASE_TICKS, upgrades);
		const dcThroughput = FissileProductionChain.batchThroughput(DC.BASE_TICKS, upgrades);
		const dcCount = FissileProductionChain.machinesNeeded(dcOpsPerTick, dcThroughput);
		const dcStage: BatchMachineStage = {
			type: 'batch',
			name: 'Chemical Dissolution Chamber',
			count: dcCount,
			opsPerTick: dcOpsPerTick,
			ticksPerOp: dcEffTicks,
			energyPerTick: dcCount * DC.BASE_ENERGY / dcEffTicks,
		};

		// --- Flow-rate machines: count = 1, they handle any required flow rate ---

		// Chemical Infuser (SO3): 2 SO2 + 1 O2 -> 2 SO3
		const ciSo3Stage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Chemical Infuser (SO\u2083)',
			count: 1,
			flowRateMbPerTick: so3Needed,
			energyPerTick: so3Needed * CI_SO3.BASE_ENERGY / CI_SO3.OUTPUT_MB,
		};

		// Rotary Condensentrator: Water -> Water Vapor (1:1)
		const rcStage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Rotary Condensentrator',
			count: 1,
			flowRateMbPerTick: waterVaporNeeded,
			energyPerTick: waterVaporNeeded * RC.BASE_ENERGY / RC.OUTPUT_VAPOR_MB,
		};

		// Chemical Infuser (H2SO4): 1 SO3 + 1 Vapor -> 1 H2SO4
		const ciH2so4Stage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Chemical Infuser (H\u2082SO\u2084)',
			count: 1,
			flowRateMbPerTick: h2so4Needed,
			energyPerTick: h2so4Needed * CI_H2SO4.BASE_ENERGY / CI_H2SO4.OUTPUT_MB,
		};

		// Electrolytic Separator: 2 Water -> 1 O2
		const esStage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Electrolytic Separator',
			count: 1,
			flowRateMbPerTick: totalO2Needed,
			energyPerTick: totalO2Needed * ES.BASE_ENERGY / ES.OUTPUT_O2_MB,
		};

		// Chemical Infuser (UF6): 1 HF + 1 UO -> 2 UF6
		const ciUf6Stage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Chemical Infuser (UF\u2086)',
			count: 1,
			flowRateMbPerTick: uf6Needed,
			energyPerTick: uf6Needed * CI_UF6.BASE_ENERGY / CI_UF6.OUTPUT_MB,
		};

		// Isotopic Centrifuge: 1 UF6 -> 1 Fissile Fuel
		const icStage: FlowRateMachineStage = {
			type: 'flow',
			name: 'Isotopic Centrifuge',
			count: 1,
			flowRateMbPerTick: R,
			energyPerTick: R * IC.BASE_ENERGY / IC.OUTPUT_MB,
		};

		// =============================================================
		// All 11 stages in logical order
		// =============================================================
		const stages: MachineStage[] = [
			ecStage,        // 1.  Path A: Enrichment Chamber (batch)
			oxUStage,       // 2.  Path A: Chemical Oxidizer - UO (batch)
			prcStage,       // 3.  Path B: Pressurized Reaction Chamber (batch)
			oxSStage,       // 4.  Path B: Chemical Oxidizer - SO2 (batch)
			ciSo3Stage,     // 5.  Path B: Chemical Infuser - SO3 (flow)
			rcStage,        // 6.  Path B: Rotary Condensentrator (flow)
			ciH2so4Stage,   // 7.  Path B: Chemical Infuser - H2SO4 (flow)
			dcStage,        // 8.  Path B: Chemical Dissolution Chamber (batch)
			esStage,        // 9.  Shared: Electrolytic Separator (flow)
			ciUf6Stage,     // 10. Final: Chemical Infuser - UF6 (flow)
			icStage,        // 11. Final: Isotopic Centrifuge (flow)
		];

		// =============================================================
		// Resource rates (external inputs only -- O2 is produced internally by ES)
		// =============================================================
		const resources: ResourceRates = {
			uraniumIngotsPerTick: ecOpsPerTick,    // R/1000
			fluoritePerTick: dcOpsPerTick,         // R/2000
			coalPerTick: prcOpsPerTick,            // R/200000
			waterMbPerTick: totalWater,            // R/400
			totalEnergyPerTick: stages.reduce((sum, s) => sum + s.energyPerTick, 0),
		};

		const totalMachines = stages.reduce((sum, s) => sum + s.count, 0);

		return {
			targetFuelRate: this.targetFuelRate,
			speedUpgrades: this.speedUpgrades,
			stages,
			resources,
			totalMachines,
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
