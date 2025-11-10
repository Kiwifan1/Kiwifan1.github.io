import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IndustrialTurbine } from '../../../models/IndustrialTurbine';

@Component({
  selector: 'app-mekanism-planner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mekanism.html',
  styleUrl: './mekanism.css',
})
export class MekanismPlanner {

  constructor() {
  }

}
