import { BOILER } from './constants';

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

export class ThermoelectricBoiler {
	public static readonly MIN_WIDTH = 3;
	public static readonly MIN_LENGTH = 3;
	public static readonly MIN_HEIGHT = 4;
	public static readonly MAX_WIDTH = 18;
	public static readonly MAX_LENGTH = 18;
	public static readonly MAX_HEIGHT = 18;

	public readonly width: number;
	public readonly length: number;
	public readonly height: number;
	public readonly waterLayers: number;
	public readonly steamLayers: number;
	public readonly superheaters: number;

	constructor(width: number, length: number, height: number, options: ThermoelectricBoilerOptions = {}) {
		ThermoelectricBoiler.validateDimensions(width, length, height);

		const defaultWaterLayers = options.waterCavityHeight ?? ThermoelectricBoiler.getDefaultWaterLayers(height);
		if (defaultWaterLayers < 1) {
			throw new Error('Water cavity must be at least one layer tall');
		}
		const h = defaultWaterLayers + 1;
		const steamLayers = height - h;
		if (steamLayers < 1) {
			throw new Error('Steam cavity must be at least one layer tall');
		}

		const layerArea = ThermoelectricBoiler.getLayerArea(width, length);
		const maxSuperheaters = defaultWaterLayers * layerArea;
		const balancedSuperheaters = Math.ceil((defaultWaterLayers * layerArea) / 21);
		const chosenSuperheaters = options.superheaterCount ?? Math.min(balancedSuperheaters, maxSuperheaters);

		if (chosenSuperheaters < 0 || chosenSuperheaters > maxSuperheaters) {
			throw new Error(`Superheater count must be between 0 and ${maxSuperheaters}`);
		}
		if (defaultWaterLayers * layerArea - chosenSuperheaters < 0) {
			throw new Error('Superheaters cannot exceed available water cavity volume');
		}

		this.width = width;
		this.length = length;
		this.height = height;
		this.waterLayers = defaultWaterLayers;
		this.steamLayers = steamLayers;
		this.superheaters = chosenSuperheaters;
	}

	public static getLayerArea(width: number, length: number): number {
		return width * length;
	}

	public static getSteamSafeH(height: number): number {
		return Math.floor((21 * height + 2) / 23);
	}

	public static getDefaultWaterLayers(height: number): number {
		const safeH = Math.min(ThermoelectricBoiler.getSteamSafeH(height), height - 1);
		return Math.max(safeH - 1, 1);
	}

	public getWaterVolume(): number {
		return this.waterLayers * this.getLayerArea() - this.superheaters;
	}

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

	public getBalancedSuperheaterEstimate(): number {
		return (this.waterLayers * this.getLayerArea()) / 11;
	}

	public isSteamNonLimiting(): boolean {
		return 2 * this.waterLayers <= 21 * this.steamLayers;
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

	public static readonly STEAM_PER_SUPERHEATER = 320000;

	private getLayerArea(): number {
		return ThermoelectricBoiler.getLayerArea(this.width, this.length);
	}

	private static validateDimensions(width: number, length: number, height: number): void {
		if (width < ThermoelectricBoiler.MIN_WIDTH || width > ThermoelectricBoiler.MAX_WIDTH) {
			throw new Error(
				`Width must be between ${ThermoelectricBoiler.MIN_WIDTH} and ${ThermoelectricBoiler.MAX_WIDTH}`
			);
		}
		if (length < ThermoelectricBoiler.MIN_LENGTH || length > ThermoelectricBoiler.MAX_LENGTH) {
			throw new Error(
				`Length must be between ${ThermoelectricBoiler.MIN_LENGTH} and ${ThermoelectricBoiler.MAX_LENGTH}`
			);
		}
		if (height < ThermoelectricBoiler.MIN_HEIGHT || height > ThermoelectricBoiler.MAX_HEIGHT) {
			throw new Error(
				`Height must be between ${ThermoelectricBoiler.MIN_HEIGHT} and ${ThermoelectricBoiler.MAX_HEIGHT}`
			);
		}
	}
}
