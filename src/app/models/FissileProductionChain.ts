import { PRODUCTION_CHAIN } from './constants';

export interface MachineRequirement {
	name: string;
	count: number;
	opsPerTick: number;
	ticksPerOp: number;
	energyPerTick: number;
}

export interface ResourceRates {
	uraniumIngotsPerTick: number;
	fluoritePerTick: number;
	coalPerTick: number;
	waterPerTick: number;
	oxygenPerTick: number;
	totalEnergyPerTick: number;
}

export interface ProductionChainResult {
	targetFuelRate: number;
	speedUpgrades: number;
	stages: MachineRequirement[];
	resources: ResourceRates;
	totalMachines: number;
}

export class FissileProductionChain {
	public static readonly MIN_FUEL_RATE = 0.1;
	public static readonly MAX_FUEL_RATE = 10000;
	public static readonly MAX_SPEED_UPGRADES = 8;

	public readonly targetFuelRate: number;
	public readonly speedUpgrades: number;

	constructor(targetFuelRate: number, speedUpgrades: number = 0) {
		FissileProductionChain.validateInputs(targetFuelRate, speedUpgrades);

		this.targetFuelRate = targetFuelRate;
		this.speedUpgrades = speedUpgrades;
	}

	public static getEffectiveTicks(baseTicks: number, speedUpgrades: number): number {
		return Math.ceil(baseTicks / (1 + speedUpgrades));
	}

	public static getMachineThroughput(outputPerOp: number, baseTicks: number, speedUpgrades: number): number {
		const effectiveTicks = FissileProductionChain.getEffectiveTicks(baseTicks, speedUpgrades);
		return outputPerOp / effectiveTicks;
	}

	public static machinesNeeded(requiredRate: number, throughputPerMachine: number): number {
		return Math.ceil(requiredRate / throughputPerMachine);
	}

	public calculate(): ProductionChainResult {
		const R = this.targetFuelRate;
		const upgrades = this.speedUpgrades;

		const EC = PRODUCTION_CHAIN.ENRICHMENT_CHAMBER;
		const OX_U = PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_URANIUM;
		const PRC = PRODUCTION_CHAIN.PRESSURIZED_REACTION_CHAMBER;
		const OX_S = PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_SULFUR;
		const CI_SO3 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_SO3;
		const RC = PRODUCTION_CHAIN.ROTARY_CONDENSENTRATOR;
		const CI_H2SO4 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_H2SO4;
		const DC = PRODUCTION_CHAIN.DISSOLUTION_CHAMBER;
		const CI_UF6 = PRODUCTION_CHAIN.CHEMICAL_INFUSER_UF6;
		const IC = PRODUCTION_CHAIN.ISOTOPIC_CENTRIFUGE;

		// -------------------------------------------------------
		// Working backwards from target fuel rate R (mB/t)
		// -------------------------------------------------------

		// Isotopic Centrifuge: 1000 mB UF6 -> 1000 mB Fissile Fuel
		const centrifugeOpsPerTick = R / IC.OUTPUT_MB;

		// UF6 Infuser: 1000 mB HF + 1000 mB UO -> 2000 mB UF6
		const uf6Needed = R; // 1:1 ratio with fuel
		const uf6InfuserOpsPerTick = uf6Needed / CI_UF6.OUTPUT_MB;
		const hfNeeded = uf6InfuserOpsPerTick * CI_UF6.INPUT_HF_MB;   // R/2
		const uoNeeded = uf6InfuserOpsPerTick * CI_UF6.INPUT_UO_MB;   // R/2

		// --- Path A: Uranium Oxide ---
		// Chemical Oxidizer (Uranium): 1 Yellow Cake -> 1000 mB UO
		const oxidizerUOpsPerTick = uoNeeded / OX_U.OUTPUT_MB;        // R/2000
		const yellowCakePerTick = oxidizerUOpsPerTick;                 // R/2000

		// Enrichment Chamber: 1 Uranium Ingot -> 1 Yellow Cake
		const enrichmentOpsPerTick = yellowCakePerTick;                // R/2000

		// --- Path B: Hydrofluoric Acid ---
		// Dissolution Chamber: Fluorite + 1000 mB H2SO4 -> 1000 mB HF
		const dissolutionOpsPerTick = hfNeeded / DC.OUTPUT_MB;         // R/2000
		const h2so4Needed = dissolutionOpsPerTick * DC.INPUT_H2SO4_MB; // R/2

		// H2SO4 Infuser: 1000 mB SO3 + 1000 mB Water Vapor -> 2000 mB H2SO4
		const h2so4InfuserOpsPerTick = h2so4Needed / CI_H2SO4.OUTPUT_MB; // R/4000
		const so3Needed = h2so4InfuserOpsPerTick * CI_H2SO4.INPUT_SO3_MB;     // R/4
		const waterVaporNeeded = h2so4InfuserOpsPerTick * CI_H2SO4.INPUT_VAPOR_MB; // R/4

		// Rotary Condensentrator: Water -> Water Vapor (1:1, 1 tick)
		const condensentratorRate = waterVaporNeeded; // R/4 mB/t

		// SO3 Infuser: 1000 mB SO2 + 1000 mB O2 -> 2000 mB SO3
		const so3InfuserOpsPerTick = so3Needed / CI_SO3.OUTPUT_MB;     // R/8000
		const so2Needed = so3InfuserOpsPerTick * CI_SO3.INPUT_SO2_MB;  // R/8
		const o2ForSO3 = so3InfuserOpsPerTick * CI_SO3.INPUT_O2_MB;   // R/8

		// Sulfur Oxidizer: 1 Sulfur Dust -> 1000 mB SO2
		const sulfurOxidizerOpsPerTick = so2Needed / OX_S.OUTPUT_MB;   // R/8000
		const sulfurDustPerTick = sulfurOxidizerOpsPerTick;            // R/8000

		// PRC: Water + Oxygen + Coal -> 1 Sulfur Dust
		const prcOpsPerTick = sulfurDustPerTick;                       // R/8000

		// -------------------------------------------------------
		// Machine counts
		// -------------------------------------------------------

		// Stage 1: Enrichment Chamber (Path A)
		const ecEffTicks = FissileProductionChain.getEffectiveTicks(EC.BASE_TICKS, upgrades);
		const ecThroughput = FissileProductionChain.getMachineThroughput(1, EC.BASE_TICKS, upgrades);
		const ecCount = FissileProductionChain.machinesNeeded(enrichmentOpsPerTick, ecThroughput);
		const ecStage: MachineRequirement = {
			name: 'Enrichment Chamber',
			count: ecCount,
			opsPerTick: enrichmentOpsPerTick,
			ticksPerOp: ecEffTicks,
			energyPerTick: ecCount * EC.BASE_ENERGY / ecEffTicks,
		};

		// Stage 2: Chemical Oxidizer (Uranium Oxide) (Path A)
		const oxUEffTicks = FissileProductionChain.getEffectiveTicks(OX_U.BASE_TICKS, upgrades);
		const oxUThroughput = FissileProductionChain.getMachineThroughput(OX_U.OUTPUT_MB, OX_U.BASE_TICKS, upgrades);
		const oxUCount = FissileProductionChain.machinesNeeded(uoNeeded, oxUThroughput);
		const oxUStage: MachineRequirement = {
			name: 'Chemical Oxidizer (Uranium Oxide)',
			count: oxUCount,
			opsPerTick: oxidizerUOpsPerTick,
			ticksPerOp: oxUEffTicks,
			energyPerTick: oxUCount * OX_U.BASE_ENERGY / oxUEffTicks,
		};

		// Stage 3: Pressurized Reaction Chamber (Path B)
		const prcEffTicks = FissileProductionChain.getEffectiveTicks(PRC.BASE_TICKS, upgrades);
		const prcThroughput = FissileProductionChain.getMachineThroughput(1, PRC.BASE_TICKS, upgrades);
		const prcCount = FissileProductionChain.machinesNeeded(prcOpsPerTick, prcThroughput);
		const prcStage: MachineRequirement = {
			name: 'Pressurized Reaction Chamber',
			count: prcCount,
			opsPerTick: prcOpsPerTick,
			ticksPerOp: prcEffTicks,
			energyPerTick: prcCount * PRC.BASE_ENERGY / prcEffTicks,
		};

		// Stage 4: Chemical Oxidizer (Sulfur Dioxide) (Path B)
		const oxSEffTicks = FissileProductionChain.getEffectiveTicks(OX_S.BASE_TICKS, upgrades);
		const oxSThroughput = FissileProductionChain.getMachineThroughput(OX_S.OUTPUT_MB, OX_S.BASE_TICKS, upgrades);
		const oxSCount = FissileProductionChain.machinesNeeded(so2Needed, oxSThroughput);
		const oxSStage: MachineRequirement = {
			name: 'Chemical Oxidizer (Sulfur Dioxide)',
			count: oxSCount,
			opsPerTick: sulfurOxidizerOpsPerTick,
			ticksPerOp: oxSEffTicks,
			energyPerTick: oxSCount * OX_S.BASE_ENERGY / oxSEffTicks,
		};

		// Stage 5: Chemical Infuser (SO3) (Path B)
		const so3EffTicks = FissileProductionChain.getEffectiveTicks(CI_SO3.BASE_TICKS, upgrades);
		const so3Throughput = FissileProductionChain.getMachineThroughput(CI_SO3.OUTPUT_MB, CI_SO3.BASE_TICKS, upgrades);
		const so3Count = FissileProductionChain.machinesNeeded(so3Needed, so3Throughput);
		const so3Stage: MachineRequirement = {
			name: 'Chemical Infuser (SO\u2083)',
			count: so3Count,
			opsPerTick: so3InfuserOpsPerTick,
			ticksPerOp: so3EffTicks,
			energyPerTick: so3Count * CI_SO3.BASE_ENERGY / so3EffTicks,
		};

		// Stage 6: Rotary Condensentrator (Path B)
		const rcEffTicks = FissileProductionChain.getEffectiveTicks(RC.BASE_TICKS, upgrades);
		const rcThroughput = FissileProductionChain.getMachineThroughput(RC.OUTPUT_VAPOR_MB, RC.BASE_TICKS, upgrades);
		const rcCount = FissileProductionChain.machinesNeeded(condensentratorRate, rcThroughput);
		const rcStage: MachineRequirement = {
			name: 'Rotary Condensentrator',
			count: rcCount,
			opsPerTick: condensentratorRate / RC.OUTPUT_VAPOR_MB,
			ticksPerOp: rcEffTicks,
			energyPerTick: rcCount * RC.BASE_ENERGY / rcEffTicks,
		};

		// Stage 7: Chemical Infuser (H2SO4) (Path B)
		const h2so4EffTicks = FissileProductionChain.getEffectiveTicks(CI_H2SO4.BASE_TICKS, upgrades);
		const h2so4Throughput = FissileProductionChain.getMachineThroughput(CI_H2SO4.OUTPUT_MB, CI_H2SO4.BASE_TICKS, upgrades);
		const h2so4Count = FissileProductionChain.machinesNeeded(h2so4Needed, h2so4Throughput);
		const h2so4Stage: MachineRequirement = {
			name: 'Chemical Infuser (H\u2082SO\u2084)',
			count: h2so4Count,
			opsPerTick: h2so4InfuserOpsPerTick,
			ticksPerOp: h2so4EffTicks,
			energyPerTick: h2so4Count * CI_H2SO4.BASE_ENERGY / h2so4EffTicks,
		};

		// Stage 8: Chemical Dissolution Chamber (Path B)
		const dcEffTicks = FissileProductionChain.getEffectiveTicks(DC.BASE_TICKS, upgrades);
		const dcThroughput = FissileProductionChain.getMachineThroughput(DC.OUTPUT_MB, DC.BASE_TICKS, upgrades);
		const dcCount = FissileProductionChain.machinesNeeded(hfNeeded, dcThroughput);
		const dcStage: MachineRequirement = {
			name: 'Chemical Dissolution Chamber',
			count: dcCount,
			opsPerTick: dissolutionOpsPerTick,
			ticksPerOp: dcEffTicks,
			energyPerTick: dcCount * DC.BASE_ENERGY / dcEffTicks,
		};

		// Stage 9: Chemical Infuser (UF6) (Final Assembly)
		const uf6EffTicks = FissileProductionChain.getEffectiveTicks(CI_UF6.BASE_TICKS, upgrades);
		const uf6Throughput = FissileProductionChain.getMachineThroughput(CI_UF6.OUTPUT_MB, CI_UF6.BASE_TICKS, upgrades);
		const uf6Count = FissileProductionChain.machinesNeeded(uf6Needed, uf6Throughput);
		const uf6Stage: MachineRequirement = {
			name: 'Chemical Infuser (UF\u2086)',
			count: uf6Count,
			opsPerTick: uf6InfuserOpsPerTick,
			ticksPerOp: uf6EffTicks,
			energyPerTick: uf6Count * CI_UF6.BASE_ENERGY / uf6EffTicks,
		};

		// Stage 10: Isotopic Centrifuge (Final Assembly)
		const icEffTicks = FissileProductionChain.getEffectiveTicks(IC.BASE_TICKS, upgrades);
		const icThroughput = FissileProductionChain.getMachineThroughput(IC.OUTPUT_MB, IC.BASE_TICKS, upgrades);
		const icCount = FissileProductionChain.machinesNeeded(R, icThroughput);
		const icStage: MachineRequirement = {
			name: 'Isotopic Centrifuge',
			count: icCount,
			opsPerTick: centrifugeOpsPerTick,
			ticksPerOp: icEffTicks,
			energyPerTick: icCount * IC.BASE_ENERGY / icEffTicks,
		};

		const stages = [
			ecStage,       // Path A: Enrichment Chamber
			oxUStage,      // Path A: Chemical Oxidizer (UO)
			prcStage,      // Path B: Pressurized Reaction Chamber
			oxSStage,      // Path B: Chemical Oxidizer (SO2)
			so3Stage,      // Path B: Chemical Infuser (SO3)
			rcStage,       // Path B: Rotary Condensentrator
			h2so4Stage,    // Path B: Chemical Infuser (H2SO4)
			dcStage,       // Path B: Chemical Dissolution Chamber
			uf6Stage,      // Final: Chemical Infuser (UF6)
			icStage,       // Final: Isotopic Centrifuge
		];

		// -------------------------------------------------------
		// Resource rates
		// -------------------------------------------------------
		const uraniumIngotsPerTick = enrichmentOpsPerTick;              // R/2000
		const fluoritePerTick = dissolutionOpsPerTick;                 // R/2000
		const coalPerTick = prcOpsPerTick;                             // R/8000

		// Water: PRC water + Condensentrator water
		const prcWaterPerTick = prcOpsPerTick * PRC.INPUT_WATER_MB;    // R/8000 * 400
		const condensentratorWaterPerTick = condensentratorRate * RC.INPUT_WATER_MB; // R/4
		const waterPerTick = prcWaterPerTick + condensentratorWaterPerTick;

		// Oxygen: PRC oxygen + SO3 infuser O2
		const prcOxygenPerTick = prcOpsPerTick * PRC.INPUT_OXYGEN_MB;  // R/8000 * 200
		const oxygenPerTick = prcOxygenPerTick + o2ForSO3;

		const totalEnergyPerTick = stages.reduce((sum, s) => sum + s.energyPerTick, 0);

		const resources: ResourceRates = {
			uraniumIngotsPerTick,
			fluoritePerTick,
			coalPerTick,
			waterPerTick,
			oxygenPerTick,
			totalEnergyPerTick,
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
