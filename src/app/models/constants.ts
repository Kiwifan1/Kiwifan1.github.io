export type CoolingMode = 'water' | 'sodium';

export const HOHLRAUM = {
    CAPACITY: 10,
    FILL_RATE: 1,
}

export const TURBINE = {
    BLADES_PER_COIL: 4,
    VENT_CHEMICAL_FLOW: 43478.262,
    DISPERSER_CHEMICAL_FLOW: 1280.0,
    CONDENSER_RATE: 128000,
    ENERGY_CAPACITY_PER_VOLUME: 16000000,
    CHEMICAL_PER_TANK: 64000
}

export const FISSION_REACTOR = {
    ENERGY_PER_FUEL: 2800000,
    CASING_HEAT_CAPACITY: 4000.0,
    SURFACE_AREA_TARGET: 1.8,
    DEFAULT_BURN_RATE: 0.1,
    BURN_PER_ASSEMBLY: 1,
    MAX_FUEL_PER_ASSEMBLY: 8000,
    COOLED_COOLANT_PER_TANK: 100000,
    HEATED_COOLANT_PER_TANK: 1000000,
    EXCESS_WASTE: 0.9,
    MELTDOWNS: {
        ENABLED: true,
        RADIUS: 8.0,
        CHANCE: 0.001,
        RADIATION_MULTIPLIER: 50.0,
        POST_MELTDOWN_DAMAGE: 75.0
    }
}

export const FUSION_REACTOR = {
    ENERGY_PER_FUEL: 10000000,
    THERMOCOUPLE_EFFICIENCY: 0.04,
    CASING_THERMAL_CONDUCTIVITY: 0.333333333,
    WATER_HEATING_RATIO: 0.27272727272727,
    FUEL_CAPACITY: 500,
    ENERGY_CAPACITY: 1000000000,
    WATER_PER_INJECTION: 1000000,
    STEAM_PER_INJECTION: 100000000
}

export const BOILER = {
    WATER_PER_TANK: 32000,
    STEAM_PER_TANK: 320000,
    HEATED_COOLANT_PER_TANK: 512000,
    COOLED_COOLANT_PER_TANK: 512000,
    WATER_CONDUCTIVITY: 0.7,
    SUPERHEATING_HEAT_TRANSFER: 16000000
}

export const EVAP_PLANT = {
    HEAT_DISSIPATION: 0.02,
    SOLAR_MULTIPLIER: 0.2,
    TEMP_MULTIPLIER: 0.4,
    HEAT_CAPACITY: 100,
    FLUID_PER_TANK: 64000,
    OUTPUT_TANK_CAPACITY: 10000
}

export const SPS = {
    POL_PER_AM: 1000,
    OUTPUT_CAPACITY: 1000,
    ENERGY_PER_INPUT: 100000
}

export const HEATING = {
    SODIUM: 200000,
    WATER: 20000
}

export const WATER_PIPE = {
    RATE: 64000,
    CAPACITY: 128000
}

export const STEAM_PIPE = {
    RATE: 256000,
    CAPACITY: 1024000
}

export const ENERGY_PER_STEAM = 10;
export const FE_TO_JOULES = 2.5;

/**
 * Fissile Fuel production chain constants (Mekanism 1.20 defaults).
 *
 * The chain has two parallel paths that merge:
 *   Path A (Uranium Oxide): Ore → Ingots → Yellow Cake → Uranium Oxide
 *   Path B (Hydrofluoric Acid): Water→O₂(ES), Coal+Water+O₂→Sulfur→SO₂→SO₃→H₂SO₄ + Fluorite→HF
 *   Final: HF + UO → UF₆ → Fissile Fuel (via Isotopic Centrifuge)
 *   Alt sulfur: Brine→Cl, Water→H₂, Cl+H₂→HCl, HCl+Gunpowder→Sulfur (via CIC)
 */
export const PRODUCTION_CHAIN = {
    // Path A: Uranium Oxide
    ENRICHMENT_CHAMBER: {
        BASE_TICKS: 200,
        OUTPUT_COUNT: 2,        // 1 Uranium Ingot → 2 Yellow Cake Uranium
        BASE_ENERGY: 16_000,
    },
    CHEMICAL_OXIDIZER_URANIUM: {
        BASE_TICKS: 100,
        OUTPUT_MB: 250,         // 1 Yellow Cake → 250 mB Uranium Oxide
        BASE_ENERGY: 40_000,
    },

    // Oxygen production (feeds PRC and SO₃ Infuser)
    // Per-operation ratio: 2 mB Water → 2 mB H₂ + 1 mB O₂
    ELECTROLYTIC_SEPARATOR: {
        INPUT_WATER_MB: 2,
        OUTPUT_O2_MB: 1,
        OUTPUT_H2_MB: 2,
        BASE_ENERGY: 80_000,
    },

    // Path B: Sulfuric Acid
    PRESSURIZED_REACTION_CHAMBER: {
        BASE_TICKS: 100,
        INPUT_WATER_MB: 100,
        INPUT_OXYGEN_MB: 100,
        OUTPUT_H2_MB: 100,      // byproduct hydrogen
        // + 1 Coal → 1 Sulfur Dust
        BASE_ENERGY: 20_000,
    },
    CHEMICAL_OXIDIZER_SULFUR: {
        BASE_TICKS: 100,
        OUTPUT_MB: 100,         // 1 Sulfur Dust → 100 mB Sulfur Dioxide
        BASE_ENERGY: 40_000,
    },
    // Per-mB ratio: 2 mB SO₂ + 1 mB O₂ → 2 mB SO₃
    CHEMICAL_INFUSER_SO3: {
        INPUT_SO2_MB: 2,
        INPUT_O2_MB: 1,
        OUTPUT_MB: 2,
        BASE_ENERGY: 40_000,
    },
    ROTARY_CONDENSENTRATOR: {
        INPUT_WATER_MB: 1,
        OUTPUT_VAPOR_MB: 1,     // Water → Water Vapor (1:1)
        BASE_ENERGY: 400,
    },
    // Per-mB ratio: 1 mB SO₃ + 1 mB Water Vapor → 1 mB H₂SO₄
    CHEMICAL_INFUSER_H2SO4: {
        INPUT_SO3_MB: 1,
        INPUT_VAPOR_MB: 1,
        OUTPUT_MB: 1,
        BASE_ENERGY: 40_000,
    },

    // Path B continued: Hydrofluoric Acid
    DISSOLUTION_CHAMBER: {
        BASE_TICKS: 100,
        INPUT_H2SO4_MB: 100,   // 1 Fluorite + 100 mB H₂SO₄ → 1000 mB HF (1 mB/tick × 100 ticks)
        OUTPUT_MB: 1000,
        BASE_ENERGY: 80_000,
    },

    // Final Assembly
    // Per-mB ratio: 1 mB HF + 1 mB UO → 2 mB UF₆
    CHEMICAL_INFUSER_UF6: {
        INPUT_HF_MB: 1,
        INPUT_UO_MB: 1,
        OUTPUT_MB: 2,
        BASE_ENERGY: 40_000,
    },
    // Per-mB ratio: 1 mB UF₆ → 1 mB Fissile Fuel
    ISOTOPIC_CENTRIFUGE: {
        INPUT_UF6_MB: 1,
        OUTPUT_MB: 1,
        BASE_ENERGY: 40_000,
    },

    MAX_SPEED_UPGRADES: 8,
}
