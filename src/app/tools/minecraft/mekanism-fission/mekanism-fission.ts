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
  turbineCoils: number;
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
  // Mekanism reactor constants
  private readonly BASE_HEAT_PER_ASSEMBLY = 1000000; // 1 MJ/t per assembly at burn rate 1
  private readonly HEAT_TO_STEAM_RATIO = 10000; // Heat units per mB of steam produced
  private readonly CONDENSER_CAPACITY = 1000; // mB/t of steam each saturating condenser processes
  private readonly PIPE_CAPACITY = 25600; // mB/t each ultimate fluid pipe can transport
  private readonly MIN_PIPES = 2; // Minimum pipes needed for proper flow
  
  // Turbine constants
  private readonly ROTOR_STEAM_CAPACITY = 1000; // mB/t per rotor blade
  private readonly COIL_FE_PER_STEAM = 0.5; // Base FE/t per mB/t per coil
  private readonly DISPERSER_CAPACITY = 1280; // mB/t per disperser
  private readonly VENT_CAPACITY = 32000; // mB/t per vent
  
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
  rotorBlades: number = 4;
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
    
    // Calculate total heat production
    const totalHeat = actualFuelAssemblies * this.BASE_HEAT_PER_ASSEMBLY * this.burnRate;
    
    // Calculate steam production based on coolant type (in mB/t)
    const coolantMultiplier = this.coolantType === 'sodium' ? 5 : 1;
    const steamProduction = (totalHeat / this.HEAT_TO_STEAM_RATIO) * coolantMultiplier;
    
    // Calculate turbine capacity and power generation
    const maxTurbineRotors = validatedTurbineHeight - 2; // One rotor per height level minus top/bottom
    const actualRotors = Math.min(this.rotorBlades, maxTurbineRotors);
    const turbineCapacity = actualRotors * this.ROTOR_STEAM_CAPACITY;
    
    // Limit steam to turbine capacity
    const effectiveSteam = Math.min(steamProduction, turbineCapacity);
    
    // Calculate coil limits (depends on turbine cross-section)
    const turbinePerimeter = 2 * (validatedTurbineWidth - 2) + 2 * (validatedTurbineWidth - 2);
    const maxCoils = turbinePerimeter * (validatedTurbineHeight - 2);
    const actualCoils = Math.min(this.electromagneticCoils, maxCoils);
    
    // Power generation based on steam flow and coils
    const powerGeneration = effectiveSteam * actualCoils * this.COIL_FE_PER_STEAM;
    
    // Calculate water consumption (equal to steam production)
    const waterConsumption = steamProduction;
    
    // Calculate turbine vents needed
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
      turbineCoils: actualCoils,
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
    this.rotorBlades = 4;
    this.electromagneticCoils = 8;
    this.enableWaterRecycling = false;
    this.results = null;
  }
  
  getMaxFuelAssemblies(): number {
    return (this.reactorWidth - 2) * (this.reactorHeight - 2) * (this.reactorLength - 2);
  }
  
  getMaxRotors(): number {
    return Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT) - 2;
  }
  
  getMaxCoils(): number {
    const height = Math.min(this.turbineHeight, this.MAX_TURBINE_HEIGHT);
    const width = Math.min(this.turbineWidth, this.MAX_TURBINE_WIDTH);
    const perimeter = 2 * (width - 2) + 2 * (width - 2);
    return perimeter * (height - 2);
  }
}
