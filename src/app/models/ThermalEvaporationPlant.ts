import { EVAP_PLANT } from './constants';
import { MultiblockStructure } from './MultiblockStructure';

/**
 * Models a Mekanism Thermal Evaporation Plant multiblock.
 *
 * The plant is a fixed 4×4 footprint tower of variable height (3–18)
 * with an open top (no roof). It uses external heat to evaporate fluids
 * (e.g., Water → Brine, Brine → Lithium).
 *
 * Heat sources: Advanced Solar Generators (on top ring, 0-4),
 * Resistive Heater, Fission Reactor waste heat, or any heat
 * connected via Thermodynamic Conductors.
 *
 * This model calculates based on solar panel heat input.
 * For other heat sources, use getSteadyStateTempFromHeat() directly.
 */
export class ThermalEvaporationPlant extends MultiblockStructure {
	public static readonly MIN_HEIGHT = 3;
	public static readonly MAX_HEIGHT = 18;
	public static readonly BASE_WIDTH = 4;
	public static readonly MAX_MULTIPLIER_TEMP = 3000;
	public static readonly AMBIENT_TEMP = 300;

	public readonly solarPanels: number;

	constructor(height: number, solarPanels: number = 0) {
		if (height < ThermalEvaporationPlant.MIN_HEIGHT || height > ThermalEvaporationPlant.MAX_HEIGHT) {
			throw new Error(
				`Height must be between ${ThermalEvaporationPlant.MIN_HEIGHT} and ${ThermalEvaporationPlant.MAX_HEIGHT}`
			);
		}
		if (solarPanels < 0 || solarPanels > 4) {
			throw new Error('Solar panel count must be between 0 and 4');
		}

		super(
			ThermalEvaporationPlant.BASE_WIDTH,
			height,
			ThermalEvaporationPlant.BASE_WIDTH
		);

		this.solarPanels = solarPanels;
	}

	/**
	 * Solar heat added per tick.
	 * Formula: solarPanels × SOLAR_MULTIPLIER × HEAT_CAPACITY
	 */
	getHeatInput(): number {
		return this.solarPanels * EVAP_PLANT.SOLAR_MULTIPLIER * EVAP_PLANT.HEAT_CAPACITY;
	}

	/**
	 * Heat lost to the environment per tick at a given temperature.
	 * Formula: HEAT_DISSIPATION × sqrt(|temp − ambientTemp|)
	 */
	getHeatDissipation(temp: number): number {
		return EVAP_PLANT.HEAT_DISSIPATION * Math.sqrt(
			Math.abs(temp - ThermalEvaporationPlant.AMBIENT_TEMP)
		);
	}

	/**
	 * Equilibrium temperature for a given heat input per tick.
	 * T_ss = ambient + (heatPerTick / HEAT_DISSIPATION)²
	 */
	getSteadyStateTempFromHeat(heatPerTick: number): number {
		if (heatPerTick <= 0) {
			return ThermalEvaporationPlant.AMBIENT_TEMP;
		}
		const ratio = heatPerTick / EVAP_PLANT.HEAT_DISSIPATION;
		return ThermalEvaporationPlant.AMBIENT_TEMP + ratio * ratio;
	}

	/**
	 * Equilibrium temperature using solar panel heat input.
	 * For other heat sources, use getSteadyStateTempFromHeat() directly.
	 */
	getSteadyStateTemp(): number {
		return this.getSteadyStateTempFromHeat(this.getHeatInput());
	}

	/**
	 * Temperature multiplier that determines production speed.
	 *
	 * Formula: (min(3000, T_ss) − ambient) × TEMP_MULTIPLIER × (height / MAX_HEIGHT)
	 */
	getTempMultiplier(): number {
		const temp = this.getSteadyStateTemp();
		const effectiveTemp = Math.min(ThermalEvaporationPlant.MAX_MULTIPLIER_TEMP, temp);
		const tempDelta = effectiveTemp - ThermalEvaporationPlant.AMBIENT_TEMP;
		if (tempDelta <= 0) {
			return 0;
		}
		return tempDelta * EVAP_PLANT.TEMP_MULTIPLIER * (this.height / ThermalEvaporationPlant.MAX_HEIGHT);
	}

	/**
	 * Effective production rate in mB/t.
	 *
	 * - If tempMultiplier ≥ 1: floor(tempMultiplier) mB/t
	 * - If 0 < tempMultiplier < 1: 1 mB every ceil(1/tempMultiplier) ticks,
	 *   which averages to tempMultiplier mB/t but this method returns
	 *   the per-tick floor (i.e., 0 for fractional rates; use getTempMultiplier
	 *   to inspect the sub-tick behaviour).
	 * - If tempMultiplier = 0: 0 mB/t
	 */
	getProductionRate(): number {
		const multiplier = this.getTempMultiplier();
		if (multiplier >= 1) {
			return Math.floor(multiplier);
		}
		if (multiplier > 0) {
			// Produces 1 mB every ceil(1/multiplier) ticks.
			// Effective average rate expressed as mB/t:
			return 1 / Math.ceil(1 / multiplier);
		}
		return 0;
	}

	/**
	 * Input tank capacity in mB.
	 * Formula: (volume / 4) × FLUID_PER_TANK
	 */
	getInputCapacity(): number {
		return (this.getVolume() / 4) * EVAP_PLANT.FLUID_PER_TANK;
	}
}
