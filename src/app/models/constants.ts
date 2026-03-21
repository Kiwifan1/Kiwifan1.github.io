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
    TEMP_MULTIPLIER: 1.85,
    HEAT_CAPACITY: 600.0,
    FLUID_PER_TANK: 128000,
    OUTPUT_TANK_CAPACITY: 64000
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
 *   Path B (Hydrofluoric Acid): Coal+Water+O₂ → Sulfur → SO₂ → SO₃ → H₂SO₄ + Fluorite → HF
 *   Final: HF + UO → UF₆ → Fissile Fuel (via Isotopic Centrifuge)
 */
export const PRODUCTION_CHAIN = {
    // Path A: Uranium Oxide
    ENRICHMENT_CHAMBER: {
        BASE_TICKS: 200,
        BASE_ENERGY: 16_000,
        // 1 Uranium Ingot → 1 Yellow Cake Uranium
    },
    CHEMICAL_OXIDIZER_URANIUM: {
        BASE_TICKS: 100,
        OUTPUT_MB: 1000,    // 1 Yellow Cake → 1000 mB Uranium Oxide
        BASE_ENERGY: 40_000,
    },

    // Path B: Sulfuric Acid
    PRESSURIZED_REACTION_CHAMBER: {
        BASE_TICKS: 200,
        INPUT_WATER_MB: 400,
        INPUT_OXYGEN_MB: 200,
        // + 1 Coal → 1 Sulfur Dust
        BASE_ENERGY: 20_000,
    },
    CHEMICAL_OXIDIZER_SULFUR: {
        BASE_TICKS: 100,
        OUTPUT_MB: 1000,    // 1 Sulfur Dust → 1000 mB Sulfur Dioxide
        BASE_ENERGY: 40_000,
    },
    CHEMICAL_INFUSER_SO3: {
        BASE_TICKS: 100,
        INPUT_SO2_MB: 1000,
        INPUT_O2_MB: 1000,
        OUTPUT_MB: 2000,    // SO₂ + O₂ → 2000 mB Sulfur Trioxide
        BASE_ENERGY: 40_000,
    },
    ROTARY_CONDENSENTRATOR: {
        BASE_TICKS: 1,
        INPUT_WATER_MB: 1,
        OUTPUT_VAPOR_MB: 1, // Water → Water Vapor (1:1)
        BASE_ENERGY: 400,
    },
    CHEMICAL_INFUSER_H2SO4: {
        BASE_TICKS: 100,
        INPUT_SO3_MB: 1000,
        INPUT_VAPOR_MB: 1000,
        OUTPUT_MB: 2000,    // SO₃ + Water Vapor → 2000 mB Sulfuric Acid
        BASE_ENERGY: 40_000,
    },

    // Path B continued: Hydrofluoric Acid
    DISSOLUTION_CHAMBER: {
        BASE_TICKS: 100,
        INPUT_H2SO4_MB: 1000,
        OUTPUT_MB: 1000,    // Fluorite + H₂SO₄ → 1000 mB Hydrofluoric Acid
        BASE_ENERGY: 80_000,
    },

    // Final Assembly
    CHEMICAL_INFUSER_UF6: {
        BASE_TICKS: 100,
        INPUT_HF_MB: 1000,
        INPUT_UO_MB: 1000,
        OUTPUT_MB: 2000,    // HF + Uranium Oxide → 2000 mB Uranium Hexafluoride
        BASE_ENERGY: 40_000,
    },
    ISOTOPIC_CENTRIFUGE: {
        BASE_TICKS: 100,
        INPUT_UF6_MB: 1000,
        OUTPUT_MB: 1000,    // UF₆ → 1000 mB Fissile Fuel
        BASE_ENERGY: 40_000,
    },

    MAX_SPEED_UPGRADES: 8,
}
