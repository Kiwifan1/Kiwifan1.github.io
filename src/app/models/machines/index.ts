import { PRODUCTION_CHAIN } from '../constants';
import { BatchMachine } from '../BatchMachine';
import { ChemicalMachine } from '../ChemicalMachine';

// Batch machines (item-processing, affected by speed upgrades)

export function createEnrichmentChamber(speedUpgrades: number = 0): BatchMachine {
  return new BatchMachine(
    'Enrichment Chamber',
    PRODUCTION_CHAIN.ENRICHMENT_CHAMBER.BASE_TICKS,
    PRODUCTION_CHAIN.ENRICHMENT_CHAMBER.BASE_ENERGY,
    speedUpgrades
  );
}

export function createChemicalOxidizerUranium(speedUpgrades: number = 0): BatchMachine {
  return new BatchMachine(
    'Chemical Oxidizer (Uranium Oxide)',
    PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_URANIUM.BASE_TICKS,
    PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_URANIUM.BASE_ENERGY,
    speedUpgrades
  );
}

export function createChemicalOxidizerSulfur(speedUpgrades: number = 0): BatchMachine {
  return new BatchMachine(
    'Chemical Oxidizer (Sulfur Dioxide)',
    PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_SULFUR.BASE_TICKS,
    PRODUCTION_CHAIN.CHEMICAL_OXIDIZER_SULFUR.BASE_ENERGY,
    speedUpgrades
  );
}

export function createPressurizedReactionChamber(speedUpgrades: number = 0): BatchMachine {
  return new BatchMachine(
    'Pressurized Reaction Chamber',
    PRODUCTION_CHAIN.PRESSURIZED_REACTION_CHAMBER.BASE_TICKS,
    PRODUCTION_CHAIN.PRESSURIZED_REACTION_CHAMBER.BASE_ENERGY,
    speedUpgrades
  );
}

export function createDissolutionChamber(speedUpgrades: number = 0): BatchMachine {
  return new BatchMachine(
    'Chemical Dissolution Chamber',
    PRODUCTION_CHAIN.DISSOLUTION_CHAMBER.BASE_TICKS,
    PRODUCTION_CHAIN.DISSOLUTION_CHAMBER.BASE_ENERGY,
    speedUpgrades
  );
}

// Chemical machines (per-mB ratio, throughput = outputMb × 2^speed)

export function createChemicalInfuserSO3(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.CHEMICAL_INFUSER_SO3;
  return new ChemicalMachine(
    'Chemical Infuser (SO\u2083)',
    { 'SO2': c.INPUT_SO2_MB, 'O2': c.INPUT_O2_MB },
    { 'SO3': c.OUTPUT_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    true
  );
}

export function createRotaryCondensentrator(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.ROTARY_CONDENSENTRATOR;
  return new ChemicalMachine(
    'Rotary Condensentrator',
    { 'Water': c.INPUT_WATER_MB },
    { 'WaterVapor': c.OUTPUT_VAPOR_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    false
  );
}

export function createChemicalInfuserH2SO4(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.CHEMICAL_INFUSER_H2SO4;
  return new ChemicalMachine(
    'Chemical Infuser (H\u2082SO\u2084)',
    { 'SO3': c.INPUT_SO3_MB, 'WaterVapor': c.INPUT_VAPOR_MB },
    { 'H2SO4': c.OUTPUT_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    true
  );
}

export function createElectrolyticSeparator(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.ELECTROLYTIC_SEPARATOR;
  return new ChemicalMachine(
    'Electrolytic Separator',
    { 'Water': c.INPUT_WATER_MB },
    { 'O2': c.OUTPUT_O2_MB, 'H2': c.OUTPUT_H2_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    false
  );
}

export function createChemicalInfuserUF6(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.CHEMICAL_INFUSER_UF6;
  return new ChemicalMachine(
    'Chemical Infuser (UF\u2086)',
    { 'HF': c.INPUT_HF_MB, 'UO': c.INPUT_UO_MB },
    { 'UF6': c.OUTPUT_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    true
  );
}

export function createIsotopicCentrifuge(speedUpgrades: number = 0): ChemicalMachine {
  const c = PRODUCTION_CHAIN.ISOTOPIC_CENTRIFUGE;
  return new ChemicalMachine(
    'Isotopic Centrifuge',
    { 'UF6': c.INPUT_UF6_MB },
    { 'FissileFuel': c.OUTPUT_MB },
    c.BASE_ENERGY,
    speedUpgrades,
    true
  );
}
