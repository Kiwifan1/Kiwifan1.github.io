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
  private readonly STEAM_TO_FE_RATIO = 6.4; // Industrial turbine: FE/t per mB/t of steam
  private readonly CONDENSER_CAPACITY = 1000; // mB/t of steam each saturating condenser processes
  private readonly PIPE_CAPACITY = 25600; // mB/t each ultimate fluid pipe can transport
  private readonly MIN_PIPES = 2; // Minimum pipes needed for proper flow

  // Input parameters
  fuelAssemblies: number = 1;
  burnRate: number = 1;
  enableWaterRecycling: boolean = false;

  // Results
  results: ReactorResults | null = null;

  calculate(): void {
    // Calculate total heat production
    const totalHeat = this.fuelAssemblies * this.BASE_HEAT_PER_ASSEMBLY * this.burnRate;
    
    // Calculate steam production (in mB/t)
    const steamProduction = totalHeat / this.HEAT_TO_STEAM_RATIO;
    
    // Calculate power generation from turbines
    const powerGeneration = steamProduction * this.STEAM_TO_FE_RATIO;
    
    // Calculate water consumption (equal to steam production)
    const waterConsumption = steamProduction;
    
    // Calculate water recycling components if enabled
    let ultimateFluidPipes = 0;
    let saturatingCondensers = 0;
    
    if (this.enableWaterRecycling) {
      // Each saturating condenser processes a fixed amount of steam per tick
      saturatingCondensers = Math.ceil(steamProduction / this.CONDENSER_CAPACITY);
      
      // Ultimate fluid pipes: need enough to transport the steam
      ultimateFluidPipes = Math.ceil(steamProduction / this.PIPE_CAPACITY);
      
      // Ensure minimum pipes for proper flow
      if (ultimateFluidPipes < this.MIN_PIPES) {
        ultimateFluidPipes = this.MIN_PIPES;
      }
    }
    
    this.results = {
      fuelAssemblies: this.fuelAssemblies,
      controlRods: this.fuelAssemblies, // 1 control rod per fuel assembly
      steamProduction: Math.round(steamProduction * 100) / 100,
      powerGeneration: Math.round(powerGeneration * 100) / 100,
      waterConsumption: Math.round(waterConsumption * 100) / 100,
      ultimateFluidPipes: ultimateFluidPipes,
      saturatingCondensers: saturatingCondensers,
    };
  }

  reset(): void {
    this.fuelAssemblies = 1;
    this.burnRate = 1;
    this.enableWaterRecycling = false;
    this.results = null;
  }
}
