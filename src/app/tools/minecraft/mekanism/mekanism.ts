import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FissionPlanner } from './fission-planner/fission-planner';

@Component({
  selector: 'app-mekanism-planner',
  standalone: true,
  imports: [CommonModule, RouterLink, FissionPlanner],
  templateUrl: './mekanism.html',
  styleUrl: './mekanism.css',
})
export class MekanismPlanner {
}
