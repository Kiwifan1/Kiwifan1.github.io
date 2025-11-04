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
  // Input parameters
  fuelAssemblies: number = 1;
  burnRate: number = 1;
  enableWaterRecycling: boolean = false;

  // Results
  results: ReactorResults | null = null;

  calculate(): void {
    // Mekanism fission reactor calculations
    // Base values per fuel assembly at burn rate 1
    const baseHeatPerAssembly = 1000000; // 1 MJ/t per assembly at burn rate 1
    const baseSteamPerMB = 10; // Steam production ratio
    const waterToSteamRatio = 1; // 1 mB water = 1 mB steam
    
    // Calculate total heat production
    const totalHeat = this.fuelAssemblies * baseHeatPerAssembly * this.burnRate;
    
    // Calculate steam production (in mB/t)
    const steamProduction = totalHeat / 10000; // Conversion from heat to steam
    
    // Calculate power generation from turbines
    // Assuming industrial turbine: 1 mB/t steam = ~6.4 RF/t
    const powerGeneration = steamProduction * 6.4;
    
    // Calculate water consumption (equal to steam production)
    const waterConsumption = steamProduction;
    
    // Calculate water recycling components if enabled
    let ultimateFluidPipes = 0;
    let saturatingCondensers = 0;
    
    if (this.enableWaterRecycling) {
      // Each saturating condenser produces 1000 mB/t of water from steam
      saturatingCondensers = Math.ceil(steamProduction / 1000);
      
      // Ultimate fluid pipes: need enough to transport the steam
      // Each ultimate fluid pipe can transport 25600 mB/t
      ultimateFluidPipes = Math.ceil(steamProduction / 25600);
      
      // Minimum of 2 pipes for input/output flow
      if (ultimateFluidPipes < 2) {
        ultimateFluidPipes = 2;
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
