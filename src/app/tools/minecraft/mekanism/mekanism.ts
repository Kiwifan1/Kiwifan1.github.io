import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-mekanism-planner',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './mekanism.html',
  styleUrl: './mekanism.css',
})
export class MekanismPlanner {

}
