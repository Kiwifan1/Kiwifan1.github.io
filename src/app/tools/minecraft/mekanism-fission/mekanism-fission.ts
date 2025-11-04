import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReactorResults {
  fuelAssemblies: number;
  controlRods: number;
  steamProduction: number;
  sodiumProduction: number;
  powerGeneration: number;
  waterConsumption: number;
  ultimateFluidPipes: number;
  saturatingCondensers: number;
  turbineRotors: number;
  turbineBlades: number;
  turbineCoils: number;
  turbineDispersers: number;
  turbineVents: number;
  turbineSize: string;
  reactorCasings: number;
  reactorGlass: number;
  structuralGlass: number;
  bladeRate: number;
  maxSteamFlow: number;
  turbinesNeeded: number;
  steamPerTurbine: number;
  boilersNeeded: number;
  superheatingElements: number;
  boilerWaterCapacity: number;
  boilerSteamCapacity: number;
}

interface BuildMaterials {
  reactorCasings: number;
  reactorGlass: number;
  structuralGlass: number;
  fuelAssemblies: number;
  controlRods: number;
  turbineRotors: number;
  turbineCoils: number;
  turbineVents: number;
  saturatingCondensers: number;
  pressurizedTubes: number;
}

@Component({
  selector: 'app-mekanism-fission',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './mekanism-fission.html',
  styleUrl: './mekanism-fission.css',
})
export class MekanismFission {
  // Mekanism reactor constants (per FTB Wiki)
  private readonly STEAM_PER_MB_FUEL = 20000; // 20,000 mB/t steam per 1 mB/t fissile fuel burned
  private readonly WATER_PER_MB_FUEL = 20000; // 20,000 mB/t water per 1 mB/t fissile fuel (water cooling)
  private readonly SODIUM_PER_MB_FUEL = 200000; // 200,000 mB/t sodium per 1 mB/t fissile fuel (sodium cooling)
  private readonly CONDENSER_CAPACITY = 1000; // mB/t of steam each saturating condenser processes
  private readonly PIPE_CAPACITY = 25600; // mB/t each ultimate fluid pipe can transport
  private readonly MIN_PIPES = 2; // Minimum pipes needed for proper flow
  
  // Boiler constants (per FTB Wiki)
  private readonly SUPERHEATER_CAPACITY = 100000; // mB/t per superheating element
  private readonly BOILER_WATER_MULTIPLIER = 16000; // mB per block in water tank
  private readonly BOILER_STEAM_MULTIPLIER = 160000; // mB per block in steam tank
  
  // Turbine constants (per FTB Wiki - from config/Mekanism/generators.toml)
  private readonly TURBINE_BLADES_PER_COIL = 4; // turbineBladesPerCoil = 4
  private readonly MAX_ROTOR_SHAFTS = 10; // Maximum rotor shafts per FTB Wiki
  private readonly MAX_BLADES = 20; // Maximum blades = 10 rotors × 2 blades per rotor
  private readonly MAX_ENERGY_PER_STEAM = 10; // maxEnergyPerSteam = "10" Joules per mB of steam
  private readonly DISPERSER_GAS_FLOW = 1280; // turbineDisperserGasFlow (mB/t per disperser, configurable)
  private readonly VENT_GAS_FLOW = 32000; // turbineVentGasFlow (mB/t per vent, configurable)
  private readonly CONDENSER_RATE = 1000; // condenserRate (mB/t per saturating condenser)
  private readonly GAS_PER_TANK = 64000; // GAS_PER_TANK for steam storage per rotor
  private readonly MAX_BLADES_PER_ROTOR = 2; // 2 blades can be placed per rotor block
  
  // Turbine size limits (interior dimensions)
  private readonly MAX_TURBINE_HEIGHT = 18;
  private readonly MAX_TURBINE_WIDTH = 17; // width and length
  
  // Power unit conversions
  private readonly FE_TO_RF_RATIO = 1; // FE and RF are 1:1
  private readonly FE_TO_AE_RATIO = 0.5; // 1 AE = 2 FE, so FE to AE is 0.5

  // Input parameters - Reactor
  reactorWidth: number = 3;
  reactorHeight: number = 4;
  reactorLength: number = 3;
  burnRate: number = 1;
  coolantType: string = 'water';
  
  // Input parameters - Boiler (for sodium cooling)
  boilerWidth: number = 5;
  boilerHeight: number = 9;
  superheatingElements: number = 4;
  
  // Input parameters - Turbine
  turbineHeight: number = 9;
  turbineWidth: number = 5;
  electromagneticCoils: number = 8;
  
  // Input parameters - Other
  enableWaterRecycling: boolean = false;
  powerUnit: string = 'FE'; // FE, RF, or AE

  // Results
  results: ReactorResults | null = null;

  calculate(): void {
    // Validate turbine dimensions
    const validatedTurbineHeight = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const validatedTurbineWidth = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    
    // AUTO-CALCULATE fuel assemblies based on reactor interior volume
    // Per Mekanism specs: 1 fuel assembly per interior block
    const reactorInteriorVolume = (this.reactorWidth - 2) * (this.reactorHeight - 2) * (this.reactorLength - 2);
    const actualFuelAssemblies = reactorInteriorVolume; // Use all available space
    
    // Calculate total fuel burn rate (per FTB Wiki formula)
    const totalBurnRate = actualFuelAssemblies * this.burnRate;
    
    // Calculate steam and coolant based on cooling type
    let steamProduction: number;
    let sodiumProduction = 0;
    let waterConsumption: number;
    let boilersNeeded = 0;
    let boilerWaterCapacity = 0;
    let boilerSteamCapacity = 0;
    
    if (this.coolantType === 'water') {
      // Water cooling: Direct steam production
      steamProduction = totalBurnRate * this.STEAM_PER_MB_FUEL;
      waterConsumption = totalBurnRate * this.WATER_PER_MB_FUEL;
    } else {
      // Sodium cooling: Produces superheated sodium, needs boiler to convert to steam
      sodiumProduction = totalBurnRate * this.SODIUM_PER_MB_FUEL;
      steamProduction = totalBurnRate * this.STEAM_PER_MB_FUEL; // Same steam output after boiler conversion
      waterConsumption = totalBurnRate * this.WATER_PER_MB_FUEL; // Water consumed by boiler
      
      // Calculate boiler requirements
      // Max boil rate per boiler = superheaters × 100,000 mB/t
      const maxBoilRatePerBoiler = this.superheatingElements * this.SUPERHEATER_CAPACITY;
      boilersNeeded = Math.ceil(sodiumProduction / maxBoilRatePerBoiler);
      
      // Calculate boiler capacities (simplified, assumes user sizes boiler appropriately)
      const boilerInteriorWidth = this.boilerWidth - 2;
      const boilerInteriorHeight = this.boilerHeight - 2;
      const boilerVolume = boilerInteriorWidth * boilerInteriorWidth * boilerInteriorHeight;
      
      // Water tank is bottom half, steam tank is top half (simplified)
      const waterTankVolume = Math.floor(boilerVolume / 2) - this.superheatingElements;
      const steamTankVolume = Math.floor(boilerVolume / 2);
      
      boilerWaterCapacity = waterTankVolume * this.BOILER_WATER_MULTIPLIER;
      boilerSteamCapacity = steamTankVolume * this.BOILER_STEAM_MULTIPLIER;
    }
    
    // Calculate turbine components per FTB Wiki formulas
    // Rotor column: The length cannot exceed 2 × TurbineWidth - 1 (interior width)
    // AND maximum rotor shafts is 10 per FTB Wiki
    const turbineInteriorWidth = validatedTurbineWidth - 2;
    const maxRotorLength = 2 * turbineInteriorWidth - 1;
    const actualRotors = Math.min(validatedTurbineHeight - 2, maxRotorLength, this.MAX_ROTOR_SHAFTS);
    
    // Calculate coil limits (depends on turbine cross-section)
    const turbinePerimeter = 4 * (turbineInteriorWidth); // Perimeter of interior
    const maxCoils = turbinePerimeter * (validatedTurbineHeight - 2);
    const actualCoils = Math.min(this.electromagneticCoils, maxCoils);
    
    // Calculate pressure dispersers (one per interior floor position minus center)
    const dispersersCount = turbineInteriorWidth * turbineInteriorWidth - 1;
    
    // Calculate blade count (each rotor can hold 2 blades)
    const maxPossibleBlades = actualRotors * this.MAX_BLADES_PER_ROTOR;
    const actualBlades = maxPossibleBlades; // All rotors should have blades
    
    // Calculate BladeRate per FTB Wiki formula
    // BladeRate = min(BladesNumber / MAX_BLADES(20), CoilsNumber × turbineBladesPerCoil(4) / MAX_BLADES(20))
    const bladeRate1 = actualBlades / this.MAX_BLADES;
    const bladeRate2 = (actualCoils * this.TURBINE_BLADES_PER_COIL) / this.MAX_BLADES;
    const bladeRate = Math.min(bladeRate1, bladeRate2, 1.0); // Cap at 1.0
    
    // Calculate max steam flow rate per single turbine (per FTB Wiki formulas)
    // MaxFlow(mB/t) = min(VentNumber × turbineVentGasFlow, Width² × RotorNumber × DisperserNumber × disperserGasFlow)
    const maxFlowFromDispersers = turbineInteriorWidth * turbineInteriorWidth * actualRotors * dispersersCount * this.DISPERSER_GAS_FLOW;
    // Assume 4 vents for a reasonable setup (user can have more)
    const estimatedVents = Math.max(4, Math.ceil(steamProduction / this.VENT_GAS_FLOW));
    const maxFlowFromVents = estimatedVents * this.VENT_GAS_FLOW;
    const maxSteamFlowPerTurbine = Math.min(maxFlowFromDispersers, maxFlowFromVents);
    
    // Calculate how many turbines are needed to process all steam
    const turbinesNeeded = Math.ceil(steamProduction / maxSteamFlowPerTurbine);
    
    // Steam per turbine
    const steamPerTurbine = Math.min(steamProduction / turbinesNeeded, maxSteamFlowPerTurbine);
    
    // Effective steam for display (what a single turbine processes)
    const effectiveSteam = steamPerTurbine;
    
    // Calculate power generation per FTB Wiki formula
    // Production(J) = maxEnergyPerSteam(10) × BladeRate × SteamFlow
    // For TOTAL power (all turbines): multiply by turbinesNeeded
    const powerGenerationFE = this.MAX_ENERGY_PER_STEAM * bladeRate * effectiveSteam * turbinesNeeded;
    
    // Convert power based on selected unit
    let powerGeneration = powerGenerationFE;
    if (this.powerUnit === 'RF') {
      powerGeneration = powerGenerationFE * this.FE_TO_RF_RATIO; // 1:1
    } else if (this.powerUnit === 'AE') {
      powerGeneration = powerGenerationFE * this.FE_TO_AE_RATIO; // 1 AE = 2 FE
    }
    
    // Calculate vents needed for steam output (per turbine)
    const ventsNeeded = Math.ceil(effectiveSteam / this.VENT_GAS_FLOW);
    
    // Calculate water recycling components if enabled (for ALL turbines)
    let ultimateFluidPipes = 0;
    let saturatingCondensers = 0;
    
    if (this.enableWaterRecycling) {
      // Saturating condensers: condenserRate (1000 mB/t per condenser) for total steam
      saturatingCondensers = Math.ceil(steamProduction / this.CONDENSER_RATE);
      // Ultimate fluid pipes transport capacity (25,600 mB/t each, cumulative) for total water
      ultimateFluidPipes = Math.ceil(steamProduction / this.PIPE_CAPACITY);
      
      if (ultimateFluidPipes < this.MIN_PIPES) {
        ultimateFluidPipes = this.MIN_PIPES;
      }
    }
    
    // Calculate construction materials
    const reactorSurfaceArea = 2 * (this.reactorWidth * this.reactorHeight + 
                                     this.reactorWidth * this.reactorLength + 
                                     this.reactorHeight * this.reactorLength);
    const reactorCasings = Math.floor(reactorSurfaceArea * 0.75); // Estimate
    const reactorGlass = Math.floor(reactorSurfaceArea * 0.25); // Estimate
    
    const turbineSurfaceArea = 2 * (validatedTurbineWidth * validatedTurbineHeight + 
                                     validatedTurbineWidth * validatedTurbineWidth + 
                                     validatedTurbineHeight * validatedTurbineWidth);
    const structuralGlass = Math.floor(turbineSurfaceArea * 0.5);
    
    // Determine turbine size category
    const turbineVolume = validatedTurbineWidth * validatedTurbineWidth * validatedTurbineHeight;
    let turbineSize = 'Small';
    if (turbineVolume > 500) turbineSize = 'Large';
    else if (turbineVolume > 200) turbineSize = 'Medium';
    
    this.results = {
      fuelAssemblies: actualFuelAssemblies,
      controlRods: actualFuelAssemblies,
      steamProduction: Math.round(steamProduction * 100) / 100,
      sodiumProduction: Math.round(sodiumProduction * 100) / 100,
      powerGeneration: Math.round(powerGeneration * 100) / 100,
      waterConsumption: Math.round(waterConsumption * 100) / 100,
      ultimateFluidPipes: ultimateFluidPipes,
      saturatingCondensers: saturatingCondensers,
      turbineRotors: actualRotors,
      turbineBlades: actualBlades,
      turbineCoils: actualCoils,
      turbineDispersers: dispersersCount,
      turbineVents: ventsNeeded,
      turbineSize: turbineSize,
      reactorCasings: reactorCasings,
      reactorGlass: reactorGlass,
      structuralGlass: structuralGlass,
      bladeRate: Math.round(bladeRate * 10000) / 100, // Show as percentage
      maxSteamFlow: Math.round(maxSteamFlowPerTurbine * 100) / 100,
      turbinesNeeded: turbinesNeeded,
      steamPerTurbine: Math.round(steamPerTurbine * 100) / 100,
      boilersNeeded: boilersNeeded,
      superheatingElements: this.superheatingElements,
      boilerWaterCapacity: Math.round(boilerWaterCapacity * 100) / 100,
      boilerSteamCapacity: Math.round(boilerSteamCapacity * 100) / 100,
    };
  }

  reset(): void {
    this.reactorWidth = 3;
    this.reactorHeight = 4;
    this.reactorLength = 3;
    this.burnRate = 1;
    this.coolantType = 'water';
    this.boilerWidth = 5;
    this.boilerHeight = 9;
    this.superheatingElements = 4;
    this.turbineHeight = 9;
    this.turbineWidth = 5;
    this.electromagneticCoils = 8;
    this.enableWaterRecycling = false;
    this.powerUnit = 'FE';
    this.results = null;
  }
  
  getCalculatedFuelAssemblies(): number {
    // Auto-calculated based on reactor interior volume
    return (this.reactorWidth - 2) * (this.reactorHeight - 2) * (this.reactorLength - 2);
  }
  
  getMaxSuperheaters(): number {
    // Simplified: assumes reasonable boiler size
    return Math.floor(((this.boilerWidth - 2) * (this.boilerWidth - 2)) / 2);
  }
  
  getMaxCoils(): number {
    const height = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const width = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    const perimeter = 2 * (width - 2) + 2 * (width - 2);
    return perimeter * (height - 2);
  }
  
  getCalculatedRotors(): number {
    const height = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const width = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    const interiorWidth = width - 2;
    const maxRotorLength = 2 * interiorWidth - 1;
    return Math.min(height - 2, maxRotorLength, this.MAX_ROTOR_SHAFTS);
  }
  
  getPowerUnitLabel(): string {
    return `${this.powerUnit}/t`;
  }
}
