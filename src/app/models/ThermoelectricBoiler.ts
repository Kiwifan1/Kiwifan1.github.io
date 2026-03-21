import { BOILER } from './constants';
import { MultiblockStructure } from './MultiblockStructure';

export interface ThermoelectricBoilerCapacities {
	water: number;
	steam: number;
	hotCoolant: number;
	coldCoolant: number;
	boil: number;
}

export interface ThermoelectricBoilerProduction {
	limit: number;
	limiting: 'water' | 'steam' | 'boil';
}

export interface ThermoelectricBoilerOptions {
	waterCavityHeight?: number;
	superheaterCount?: number;
}

/**
 * Models a Mekanism Thermoelectric Boiler multiblock.
 *
 * The boiler is split into three horizontal sections (bottom to top):
 *   1. Water cavity  — holds water/coolant and superheating elements
 *   2. Pressure disperser deck — a single layer separating water from steam
 *   3. Steam cavity  — collects produced steam
 *
 * Mekanism counts the disperser layer toward BOTH tank volumes, so:
 *   waterVolume = waterLayers × area − superheaters
 *   steamVolume = steamLayers × area
 * where `waterLayers` includes the disperser contribution (doc's w + 1)
 * and `steamLayers` includes the disperser contribution (doc's s + 1).
 *
 * The balanced superheater ratio derives from setting C_water = C_boil:
 *   N_balanced = waterLayers × area / BALANCED_RATIO
 * where BALANCED_RATIO = 1 + STEAM_PER_SUPERHEATER / WATER_PER_TANK.
 */
export class ThermoelectricBoiler extends MultiblockStructure {
	public static readonly MIN_WIDTH = 3;
	public static readonly MIN_LENGTH = 3;
	public static readonly MIN_HEIGHT = 4;
	public static readonly MAX_WIDTH = 18;
	public static readonly MAX_LENGTH = 18;
	public static readonly MAX_HEIGHT = 18;

	/** Steam produced per superheating element per tick (mB/t). */
	public static readonly STEAM_PER_SUPERHEATER = 320_000;

	/**
	 * The ratio at which adding one more superheater costs exactly as much
	 * water capacity as it gains in boil throughput.
	 *
	 * Derived from: α(wA − N) = φN  →  N = wA / (1 + φ/α)
	 * where α = WATER_PER_TANK, φ = STEAM_PER_SUPERHEATER.
	 */
	public static readonly BALANCED_RATIO =
		1 + ThermoelectricBoiler.STEAM_PER_SUPERHEATER / BOILER.WATER_PER_TANK;

	/** Water-side layers including the disperser contribution (doc's w + 1). */
	public readonly waterLayers: number;
	/** Steam-side layers including the disperser contribution (doc's s + 1). */
	public readonly steamLayers: number;
	public readonly superheaters: number;

	constructor(width: number, length: number, height: number, options: ThermoelectricBoilerOptions = {}) {
		ThermoelectricBoiler.validateDimensions(width, length, height);
		super(width, height, length);

		const waterLayers = options.waterCavityHeight ?? ThermoelectricBoiler.getDefaultWaterLayers(height);
		if (waterLayers < 1) {
			throw new Error('Water cavity must be at least one layer tall');
		}

		const steamLayers = height - waterLayers - 1;
		if (steamLayers < 1) {
			throw new Error('Steam cavity must be at least one layer tall');
		}

		const area = ThermoelectricBoiler.getLayerArea(width, length);
		const maxSuperheaters = waterLayers * area;
		const balancedSuperheaters = Math.ceil(waterLayers * area / ThermoelectricBoiler.BALANCED_RATIO);
		const superheaters = options.superheaterCount ?? Math.min(balancedSuperheaters, maxSuperheaters);

		if (superheaters < 0 || superheaters > maxSuperheaters) {
			throw new Error(`Superheater count must be between 0 and ${maxSuperheaters}`);
		}
		if (waterLayers * area - superheaters < 0) {
			throw new Error('Superheaters cannot exceed available water cavity volume');
		}

		this.waterLayers = waterLayers;
		this.steamLayers = steamLayers;
		this.superheaters = superheaters;
	}

	public static getLayerArea(width: number, length: number): number {
		return width * length;
	}

	/**
	 * Maximum water-side height `h` (waterLayers + 1 for the disperser)
	 * such that the steam buffer never becomes the bottleneck.
	 *
	 * Derived from: waterLayers ≤ BALANCED_RATIO × steamLayers
	 *   (h − 1) ≤ R × (H − h)  →  h ≤ (R·H + 1) / (R + 1)
	 */
	public static getSteamSafeH(height: number): number {
		const R = ThermoelectricBoiler.BALANCED_RATIO;
		return Math.floor((R * height + 1) / (R + 1));
	}

	/**
	 * Default water cavity layers for a given exterior height.
	 * Maximises water allocation while keeping steam non-limiting.
	 */
	public static getDefaultWaterLayers(height: number): number {
		const safeH = Math.min(ThermoelectricBoiler.getSteamSafeH(height), height - 1);
		return Math.max(safeH - 1, 1);
	}

	/** Water-side volume (blocks), including disperser contribution minus superheaters. */
	public getWaterVolume(): number {
		return this.waterLayers * this.getLayerArea() - this.superheaters;
	}

	/** Steam-side volume (blocks), including disperser contribution. */
	public getSteamVolume(): number {
		return this.steamLayers * this.getLayerArea();
	}

	public getCapacities(): ThermoelectricBoilerCapacities {
		const waterVolume = this.getWaterVolume();
		const steamVolume = this.getSteamVolume();
		return {
			water: waterVolume * BOILER.WATER_PER_TANK,
			hotCoolant: waterVolume * BOILER.HEATED_COOLANT_PER_TANK,
			steam: steamVolume * BOILER.STEAM_PER_TANK,
			coldCoolant: steamVolume * BOILER.COOLED_COOLANT_PER_TANK,
			boil: this.superheaters * ThermoelectricBoiler.STEAM_PER_SUPERHEATER,
		};
	}

	public getProductionLimit(): ThermoelectricBoilerProduction {
		const capacities = this.getCapacities();
		const min = Math.min(capacities.water, capacities.steam, capacities.boil);
		let limiting: ThermoelectricBoilerProduction['limiting'] = 'water';
		if (min === capacities.steam) {
			limiting = 'steam';
		} else if (min === capacities.boil) {
			limiting = 'boil';
		}
		return { limit: min, limiting };
	}

	/**
	 * The superheater count where C_water ≈ C_boil (the balanced operating point).
	 * N = waterLayers × area / BALANCED_RATIO
	 */
	public getBalancedSuperheaterEstimate(): number {
		return (this.waterLayers * this.getLayerArea()) / ThermoelectricBoiler.BALANCED_RATIO;
	}

	/** True when the steam buffer has enough headroom to never be the bottleneck. */
	public isSteamNonLimiting(): boolean {
		return this.waterLayers <= ThermoelectricBoiler.BALANCED_RATIO * this.steamLayers;
	}

	public getWaterToBoilDelta(): number {
		const capacities = this.getCapacities();
		return capacities.water - capacities.boil;
	}

	public getSuperheaterRecommendations(): { balanced: number; maximum: number } {
		const max = this.waterLayers * this.getLayerArea();
		const balanced = Math.min(Math.ceil(this.getBalancedSuperheaterEstimate()), max);
		return { balanced, maximum: max };
	}

	private getLayerArea(): number {
		return ThermoelectricBoiler.getLayerArea(this.width, this.length);
	}

	private static validateDimensions(width: number, length: number, height: number): void {
		MultiblockStructure.validateDimensionRange(width, ThermoelectricBoiler.MIN_WIDTH, ThermoelectricBoiler.MAX_WIDTH, 'Width');
		MultiblockStructure.validateDimensionRange(length, ThermoelectricBoiler.MIN_LENGTH, ThermoelectricBoiler.MAX_LENGTH, 'Length');
		MultiblockStructure.validateDimensionRange(height, ThermoelectricBoiler.MIN_HEIGHT, ThermoelectricBoiler.MAX_HEIGHT, 'Height');
	}
}
