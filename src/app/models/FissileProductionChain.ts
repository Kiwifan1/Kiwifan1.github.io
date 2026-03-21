import { PRODUCTION_CHAIN } from './constants';

export interface MachineRequirement {
	name: string;
	count: number;
	opsPerTick: number;
	ticksPerOp: number;
	energyPerTick: number;
}

export interface ResourceRates {
	orePerTick: number;
	waterPerTick: number;
	chlorinePerTick: number;
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
		const upgrades = this.speedUpgrades;
		const DC = PRODUCTION_CHAIN.DISSOLUTION_CHAMBER;
		const CW = PRODUCTION_CHAIN.CHEMICAL_WASHER;
		const CC = PRODUCTION_CHAIN.CHEMICAL_CRYSTALLIZER;
		const EC = PRODUCTION_CHAIN.ENRICHMENT_CHAMBER;
		const CIF = PRODUCTION_CHAIN.CHEMICAL_INFUSER_FUEL;
		const ES = PRODUCTION_CHAIN.ELECTROLYTIC_SEPARATOR;
		const CIH = PRODUCTION_CHAIN.CHEMICAL_INFUSER_HCL;

		// Work backwards from target fuel rate (mB/t)
		const fuelOpsPerTick = this.targetFuelRate / CIF.OUTPUT_MB;
		const enrichedPerTick = fuelOpsPerTick; // 1 enriched uranium per fuel op
		const yellowCakePerTick = enrichedPerTick; // 1:1 enrichment
		const cleanSlurryPerTick = yellowCakePerTick * CC.INPUT_MB;
		const dirtySlurryPerTick = cleanSlurryPerTick; // 1:1 washer
		const hclPerTick = fuelOpsPerTick * CIF.INPUT_HCL_MB;
		const h2PerTick = hclPerTick; // H2 matches HCl output volume

		// Stage 1: Dissolution Chamber
		const dcThroughput = FissileProductionChain.getMachineThroughput(DC.OUTPUT_MB, DC.BASE_TICKS, upgrades);
		const dcCount = FissileProductionChain.machinesNeeded(dirtySlurryPerTick, dcThroughput);
		const dcEffTicks = FissileProductionChain.getEffectiveTicks(DC.BASE_TICKS, upgrades);
		const dcStage: MachineRequirement = {
			name: 'Dissolution Chamber',
			count: dcCount,
			opsPerTick: dirtySlurryPerTick / DC.OUTPUT_MB,
			ticksPerOp: dcEffTicks,
			energyPerTick: dcCount * DC.BASE_ENERGY / dcEffTicks,
		};

		// Stage 2: Chemical Washer
		const cwThroughput = FissileProductionChain.getMachineThroughput(CW.OUTPUT_MB, CW.BASE_TICKS, upgrades);
		const cwCount = FissileProductionChain.machinesNeeded(cleanSlurryPerTick, cwThroughput);
		const cwEffTicks = FissileProductionChain.getEffectiveTicks(CW.BASE_TICKS, upgrades);
		const cwStage: MachineRequirement = {
			name: 'Chemical Washer',
			count: cwCount,
			opsPerTick: cleanSlurryPerTick / CW.OUTPUT_MB,
			ticksPerOp: cwEffTicks,
			energyPerTick: cwCount * CW.BASE_ENERGY / cwEffTicks,
		};

		// Stage 3: Chemical Crystallizer
		const ccThroughput = FissileProductionChain.getMachineThroughput(1, CC.BASE_TICKS, upgrades);
		const ccCount = FissileProductionChain.machinesNeeded(yellowCakePerTick, ccThroughput);
		const ccEffTicks = FissileProductionChain.getEffectiveTicks(CC.BASE_TICKS, upgrades);
		const ccStage: MachineRequirement = {
			name: 'Chemical Crystallizer',
			count: ccCount,
			opsPerTick: yellowCakePerTick,
			ticksPerOp: ccEffTicks,
			energyPerTick: ccCount * CC.BASE_ENERGY / ccEffTicks,
		};

		// Stage 4: Enrichment Chamber
		const ecThroughput = FissileProductionChain.getMachineThroughput(1, EC.BASE_TICKS, upgrades);
		const ecCount = FissileProductionChain.machinesNeeded(enrichedPerTick, ecThroughput);
		const ecEffTicks = FissileProductionChain.getEffectiveTicks(EC.BASE_TICKS, upgrades);
		const ecStage: MachineRequirement = {
			name: 'Enrichment Chamber',
			count: ecCount,
			opsPerTick: enrichedPerTick,
			ticksPerOp: ecEffTicks,
			energyPerTick: ecCount * EC.BASE_ENERGY / ecEffTicks,
		};

		// Stage 5: Chemical Infuser (Fissile Fuel)
		const cifThroughput = FissileProductionChain.getMachineThroughput(CIF.OUTPUT_MB, CIF.BASE_TICKS, upgrades);
		const cifCount = FissileProductionChain.machinesNeeded(this.targetFuelRate, cifThroughput);
		const cifEffTicks = FissileProductionChain.getEffectiveTicks(CIF.BASE_TICKS, upgrades);
		const cifStage: MachineRequirement = {
			name: 'Chemical Infuser (Fuel)',
			count: cifCount,
			opsPerTick: fuelOpsPerTick,
			ticksPerOp: cifEffTicks,
			energyPerTick: cifCount * CIF.BASE_ENERGY / cifEffTicks,
		};

		// Stage 6: Electrolytic Separator (H2 production)
		const esThroughput = FissileProductionChain.getMachineThroughput(ES.OUTPUT_H2_MB, ES.BASE_TICKS, upgrades);
		const esCount = FissileProductionChain.machinesNeeded(h2PerTick, esThroughput);
		const esEffTicks = FissileProductionChain.getEffectiveTicks(ES.BASE_TICKS, upgrades);
		const esStage: MachineRequirement = {
			name: 'Electrolytic Separator',
			count: esCount,
			opsPerTick: h2PerTick / ES.OUTPUT_H2_MB,
			ticksPerOp: esEffTicks,
			energyPerTick: esCount * ES.BASE_ENERGY / esEffTicks,
		};

		// Stage 7: Chemical Infuser (HCl)
		const cihThroughput = FissileProductionChain.getMachineThroughput(CIH.OUTPUT_MB, CIH.BASE_TICKS, upgrades);
		const cihCount = FissileProductionChain.machinesNeeded(hclPerTick, cihThroughput);
		const cihEffTicks = FissileProductionChain.getEffectiveTicks(CIH.BASE_TICKS, upgrades);
		const cihStage: MachineRequirement = {
			name: 'Chemical Infuser (HCl)',
			count: cihCount,
			opsPerTick: hclPerTick / CIH.OUTPUT_MB,
			ticksPerOp: cihEffTicks,
			energyPerTick: cihCount * CIH.BASE_ENERGY / cihEffTicks,
		};

		const stages = [dcStage, cwStage, ccStage, ecStage, cifStage, esStage, cihStage];

		// Resource rates
		const orePerTick = dirtySlurryPerTick / DC.OUTPUT_MB;
		const washerWaterPerTick = cwCount * CW.WATER_MB / cwEffTicks;
		const separatorWaterPerTick = esCount * ES.INPUT_WATER_MB / esEffTicks;
		const waterPerTick = washerWaterPerTick + separatorWaterPerTick;
		const chlorinePerTick = hclPerTick;
		const totalEnergyPerTick = stages.reduce((sum, s) => sum + s.energyPerTick, 0);

		const resources: ResourceRates = {
			orePerTick,
			waterPerTick,
			chlorinePerTick,
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
