import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FissionPlanner } from './fission-planner/fission-planner';
import { FuelChainPlanner } from './fuel-chain-planner/fuel-chain-planner';
import { FusionPlanner } from './fusion-planner/fusion-planner';
import { EvaporationPlanner } from './evaporation-planner/evaporation-planner';
import { SPSPlanner } from './sps-planner/sps-planner';

type PlannerTab = 'fission' | 'fuel-chain' | 'fusion' | 'evaporation' | 'sps';

@Component({
  selector: 'app-mekanism-planner',
  standalone: true,
  imports: [CommonModule, RouterLink, FissionPlanner, FuelChainPlanner, FusionPlanner, EvaporationPlanner, SPSPlanner],
  templateUrl: './mekanism.html',
  styleUrl: './mekanism.css',
})
export class MekanismPlanner {
  activeTab = signal<PlannerTab>('fission');

  switchTab(tab: PlannerTab): void {
    this.activeTab.set(tab);
  }
}
