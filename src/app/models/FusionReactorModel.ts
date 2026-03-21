import { FUSION_REACTOR } from './constants';

export class FusionReactorModel {
  public static readonly MAX_INJECTION = 98;
  public static readonly BURN_TEMPERATURE = 100_000_000; // 1e8 K
  public static readonly PLASMA_HEAT_CAPACITY = 100;
  public static readonly PLASMA_CASE_CONDUCTIVITY = 0.2;
  public static readonly AMBIENT_TEMP = 300; // K

  public readonly injectionRate: number;
  public readonly coolingMode: 'passive' | 'active';

  constructor(injectionRate: number, coolingMode: 'passive' | 'active') {
    if (injectionRate < 0 || injectionRate > FusionReactorModel.MAX_INJECTION) {
      throw new Error(
        `Injection rate must be between 0 and ${FusionReactorModel.MAX_INJECTION}`
      );
    }
    if (injectionRate % 2 !== 0) {
      throw new Error('Injection rate must be an even number');
    }

    this.injectionRate = injectionRate;
    this.coolingMode = coolingMode;
  }

  // ---------------------------------------------------------------------------
  // Fuel consumption
  // ---------------------------------------------------------------------------

  /** Deuterium consumed per tick (mB/t). */
  getDeuteriumRate(): number {
    return this.injectionRate / 2;
  }

  /** Tritium consumed per tick (mB/t). */
  getTritiumRate(): number {
    return this.injectionRate / 2;
  }

  /** The burn ratio derived from injection rate. */
  getBurnRatio(): number {
    return this.injectionRate / 2;
  }

  // ---------------------------------------------------------------------------
  // Fuel burned per tick
  // ---------------------------------------------------------------------------

  /**
   * Fuel burned per tick given current plasma temperature and stored fuel.
   *
   * Formula: clamp((plasmaTemp - BURN_TEMPERATURE) * burnRatio, 0, stored)
   */
  getFuelBurned(plasmaTemp: number, stored: number): number {
    const raw =
      (plasmaTemp - FusionReactorModel.BURN_TEMPERATURE) * this.getBurnRatio();
    return Math.min(Math.max(raw, 0), stored);
  }

  /**
   * Plasma temperature increase from burning fuel (K per tick).
   *
   * deltaT = fuelBurned * ENERGY_PER_FUEL / PLASMA_HEAT_CAPACITY
   */
  getPlasmaHeatingFromFuel(fuelBurned: number): number {
    return (
      (fuelBurned * FUSION_REACTOR.ENERGY_PER_FUEL) /
      FusionReactorModel.PLASMA_HEAT_CAPACITY
    );
  }

  // ---------------------------------------------------------------------------
  // Heat transfer
  // ---------------------------------------------------------------------------

  /**
   * Heat transferred from plasma to casing per tick (K, scaled by heat capacities
   * on each side externally).
   *
   * Q = plasmaCaseConductivity * (plasmaTemp - caseTemp)
   */
  getPlasmaToCaseHeat(plasmaTemp: number, caseTemp: number): number {
    return FusionReactorModel.PLASMA_CASE_CONDUCTIVITY * (plasmaTemp - caseTemp);
  }

  /**
   * Heat transferred from casing to ambient per tick.
   *
   * Q = CASING_THERMAL_CONDUCTIVITY * (caseTemp - ambientTemp)
   */
  getCaseToAirHeat(caseTemp: number): number {
    return (
      FUSION_REACTOR.CASING_THERMAL_CONDUCTIVITY *
      (caseTemp - FusionReactorModel.AMBIENT_TEMP)
    );
  }

  // ---------------------------------------------------------------------------
  // Energy output — passive (thermocouple)
  // ---------------------------------------------------------------------------

  /**
   * Energy produced by passive thermocouple cooling (J/t).
   *
   * P = THERMOCOUPLE_EFFICIENCY * CASING_THERMAL_CONDUCTIVITY * (caseTemp - ambient)
   */
  getThermocoupleOutput(caseTemp: number): number {
    return (
      FUSION_REACTOR.THERMOCOUPLE_EFFICIENCY *
      FUSION_REACTOR.CASING_THERMAL_CONDUCTIVITY *
      (caseTemp - FusionReactorModel.AMBIENT_TEMP)
    );
  }

  // ---------------------------------------------------------------------------
  // Steam output — active cooling
  // ---------------------------------------------------------------------------

  /**
   * Steam produced per tick (mB/t) in active cooling mode.
   *
   * steam = WATER_HEATING_RATIO * (caseTemp - ambient)
   *
   * Note: In practice this is further limited by water supply and steam tank
   * capacity, which are not modelled here.
   */
  getSteamOutput(caseTemp: number): number {
    return (
      FUSION_REACTOR.WATER_HEATING_RATIO *
      (caseTemp - FusionReactorModel.AMBIENT_TEMP)
    );
  }

  // ---------------------------------------------------------------------------
  // Tank capacities (scale with injection rate)
  // ---------------------------------------------------------------------------

  /** Maximum water tank capacity (mB). */
  getWaterCapacity(): number {
    return this.injectionRate * FUSION_REACTOR.WATER_PER_INJECTION;
  }

  /** Maximum steam tank capacity (mB). */
  getSteamCapacity(): number {
    return this.injectionRate * FUSION_REACTOR.STEAM_PER_INJECTION;
  }

  /** Fixed fuel capacity (mB). */
  getFuelCapacity(): number {
    return FUSION_REACTOR.FUEL_CAPACITY;
  }

  /** Fixed energy capacity (J). */
  getEnergyCapacity(): number {
    return FUSION_REACTOR.ENERGY_CAPACITY;
  }

  // ---------------------------------------------------------------------------
  // Ignition
  // ---------------------------------------------------------------------------

  /**
   * Minimum plasma temperature for the fusion reaction to sustain.
   *
   * T_ignition = BURN_TEMPERATURE / burnRatio
   *
   * Returns Infinity when injectionRate is 0 (no burn ratio).
   */
  getIgnitionTemperature(): number {
    const burnRatio = this.getBurnRatio();
    if (burnRatio <= 0) {
      return Infinity;
    }
    return FusionReactorModel.BURN_TEMPERATURE / burnRatio;
  }

  // ---------------------------------------------------------------------------
  // Steady-state analysis
  // ---------------------------------------------------------------------------

  /**
   * Computes the steady-state casing temperature.
   *
   * At steady state the heat entering the casing from the plasma equals the heat
   * leaving to the environment / coolant. For the passive (thermocouple) case the
   * casing heat loss is governed by CASING_THERMAL_CONDUCTIVITY.
   *
   * We assume steady-state fuel burn equals injectionRate (all injected fuel burns)
   * and that the plasma temperature is high enough for full burn.
   *
   * Energy into casing per tick:
   *   Q_in = plasmaCaseConductivity * (T_plasma - T_case)
   *
   * At full steady state, the plasma temperature also stabilises so that heating
   * from fuel equals heat lost to the casing:
   *   fuelBurned * ENERGY_PER_FUEL / PLASMA_HEAT_CAPACITY = plasmaCaseConductivity * (T_plasma - T_case)
   *
   * And casing heat balance:
   *   plasmaCaseConductivity * (T_plasma - T_case) = CASING_THERMAL_CONDUCTIVITY * (T_case - AMBIENT)
   *
   * From the casing balance:
   *   T_plasma = T_case + (CASING_THERMAL_CONDUCTIVITY / plasmaCaseConductivity) * (T_case - AMBIENT)
   *
   * From the plasma balance (fuelBurned = injectionRate at steady state):
   *   injectionRate * ENERGY_PER_FUEL / PLASMA_HEAT_CAPACITY = plasmaCaseConductivity * (T_plasma - T_case)
   *
   * Substituting T_plasma - T_case = (CASING_THERMAL_CONDUCTIVITY / plasmaCaseConductivity) * (T_case - AMBIENT):
   *
   *   injectionRate * ENERGY_PER_FUEL / PLASMA_HEAT_CAPACITY
   *       = plasmaCaseConductivity * CASING_THERMAL_CONDUCTIVITY / plasmaCaseConductivity * (T_case - AMBIENT)
   *       = CASING_THERMAL_CONDUCTIVITY * (T_case - AMBIENT)
   *
   * Solving for T_case:
   *   T_case = AMBIENT + (injectionRate * ENERGY_PER_FUEL) / (PLASMA_HEAT_CAPACITY * CASING_THERMAL_CONDUCTIVITY)
   */
  getSteadyStateCaseTemp(): number {
    if (this.injectionRate === 0) {
      return FusionReactorModel.AMBIENT_TEMP;
    }
    return (
      FusionReactorModel.AMBIENT_TEMP +
      (this.injectionRate * FUSION_REACTOR.ENERGY_PER_FUEL) /
        (FusionReactorModel.PLASMA_HEAT_CAPACITY *
          FUSION_REACTOR.CASING_THERMAL_CONDUCTIVITY)
    );
  }

  /**
   * Steady-state energy output (J/t).
   *
   * Passive mode: THERMOCOUPLE_EFFICIENCY * CASING_THERMAL_CONDUCTIVITY * (T_case_ss - AMBIENT)
   * Active mode:  steam-based; returns the steam output (mB/t) at steady-state case temp,
   *               since actual energy depends on the turbine configuration.
   *
   * For passive mode this simplifies to:
   *   P = THERMOCOUPLE_EFFICIENCY * injectionRate * ENERGY_PER_FUEL / PLASMA_HEAT_CAPACITY
   */
  getSteadyStateEnergyOutput(): number {
    const caseTempSS = this.getSteadyStateCaseTemp();

    if (this.coolingMode === 'passive') {
      return this.getThermocoupleOutput(caseTempSS);
    }

    // Active mode: return steam mB/t at steady state (energy depends on turbine)
    return this.getSteamOutput(caseTempSS);
  }
}
