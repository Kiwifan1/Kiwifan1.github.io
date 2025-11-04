import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReactorResults {
  fuelAssemblies: number;
  controlRods: number;
  steamProduction: number;
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
  
  // Turbine constants (per FTB Wiki)
  private readonly BLADES_PER_COIL = 4; // Optimal blade count = coils × 4
  private readonly STEAM_PER_COIL = 200; // Each coil can process 200 mB steam/tick
  private readonly FE_PER_STEAM = 5000; // Joules per mB of steam (approximate for basic coils)
  private readonly DISPERSER_CAPACITY = 1280; // mB/t per disperser
  private readonly VENT_CAPACITY = 32000; // mB/t per vent
  private readonly MAX_BLADES_PER_ROTOR = 2; // 2 blades per rotor block
  
  // Turbine size limits (interior dimensions)
  private readonly MAX_TURBINE_HEIGHT = 18;
  private readonly MAX_TURBINE_WIDTH = 17; // width and length

  // Input parameters - Reactor
  reactorWidth: number = 3;
  reactorHeight: number = 4;
  reactorLength: number = 3;
  fuelAssemblies: number = 1;
  burnRate: number = 1;
  coolantType: string = 'water';
  
  // Input parameters - Turbine
  turbineHeight: number = 9;
  turbineWidth: number = 5;
  electromagneticCoils: number = 8;
  
  // Input parameters - Other
  enableWaterRecycling: boolean = false;

  // Results
  results: ReactorResults | null = null;

  calculate(): void {
    // Validate turbine dimensions
    const validatedTurbineHeight = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const validatedTurbineWidth = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    
    // Calculate reactor interior volume
    const reactorInteriorVolume = (this.reactorWidth - 2) * (this.reactorHeight - 2) * (this.reactorLength - 2);
    const maxFuelAssemblies = reactorInteriorVolume;
    const actualFuelAssemblies = Math.min(this.fuelAssemblies, maxFuelAssemblies);
    
    // Calculate total fuel burn rate (per FTB Wiki formula)
    const totalBurnRate = actualFuelAssemblies * this.burnRate;
    
    // Calculate steam production: 20,000 mB/t per 1 mB/t fuel burned (per FTB Wiki)
    const steamProduction = totalBurnRate * this.STEAM_PER_MB_FUEL;
    
    // Calculate water/coolant consumption based on coolant type
    const waterConsumption = this.coolantType === 'water' 
      ? totalBurnRate * this.WATER_PER_MB_FUEL 
      : totalBurnRate * this.SODIUM_PER_MB_FUEL;
    
    // Calculate turbine components
    // Rotor blades automatically fill the entire height (height - 2 for top/bottom blocks)
    const actualRotors = validatedTurbineHeight - 2;
    
    // Calculate coil limits (depends on turbine cross-section)
    const turbinePerimeter = 2 * (validatedTurbineWidth - 2) + 2 * (validatedTurbineWidth - 2);
    const maxCoils = turbinePerimeter * (validatedTurbineHeight - 2);
    const actualCoils = Math.min(this.electromagneticCoils, maxCoils);
    
    // Calculate optimal blades needed (per FTB Wiki: optimal = coils × 4)
    const optimalBlades = actualCoils * this.BLADES_PER_COIL;
    
    // Calculate actual blade count based on rotors (each rotor can hold 2 blades)
    const maxPossibleBlades = actualRotors * this.MAX_BLADES_PER_ROTOR;
    const actualBlades = Math.min(optimalBlades, maxPossibleBlades);
    
    // Calculate turbine steam processing capacity (each coil processes 200 mB/t)
    const turbineSteamCapacity = actualCoils * this.STEAM_PER_COIL;
    const effectiveSteam = Math.min(steamProduction, turbineSteamCapacity);
    
    // Calculate power generation (FE/t) based on effective steam flow
    // Formula: effective steam × FE per mB × efficiency factor from coils
    const powerGeneration = effectiveSteam * (this.FE_PER_STEAM / 1000);
    
    // Calculate dispersers needed for steam input (each disperser handles 1280 mB/t)
    const dispersersNeeded = Math.ceil(steamProduction / this.DISPERSER_CAPACITY);
    
    // Calculate turbine vents needed for steam output
    const ventsNeeded = Math.ceil(steamProduction / this.VENT_CAPACITY);
    
    // Calculate water recycling components if enabled
    let ultimateFluidPipes = 0;
    let saturatingCondensers = 0;
    
    if (this.enableWaterRecycling) {
      saturatingCondensers = Math.ceil(steamProduction / this.CONDENSER_CAPACITY);
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
      powerGeneration: Math.round(powerGeneration * 100) / 100,
      waterConsumption: Math.round(waterConsumption * 100) / 100,
      ultimateFluidPipes: ultimateFluidPipes,
      saturatingCondensers: saturatingCondensers,
      turbineRotors: actualRotors,
      turbineBlades: actualBlades,
      turbineCoils: actualCoils,
      turbineDispersers: dispersersNeeded,
      turbineVents: ventsNeeded,
      turbineSize: turbineSize,
      reactorCasings: reactorCasings,
      reactorGlass: reactorGlass,
      structuralGlass: structuralGlass,
    };
  }

  reset(): void {
    this.reactorWidth = 3;
    this.reactorHeight = 4;
    this.reactorLength = 3;
    this.fuelAssemblies = 1;
    this.burnRate = 1;
    this.coolantType = 'water';
    this.turbineHeight = 9;
    this.turbineWidth = 5;
    this.electromagneticCoils = 8;
    this.enableWaterRecycling = false;
    this.results = null;
  }
  
  getMaxFuelAssemblies(): number {
    return (this.reactorWidth - 2) * (this.reactorHeight - 2) * (this.reactorLength - 2);
  }
  
  getMaxCoils(): number {
    const height = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const width = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    const perimeter = 2 * (width - 2) + 2 * (width - 2);
    return perimeter * (height - 2);
  }
  
  getCalculatedRotors(): number {
    return Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT) - 2;
  }
}
