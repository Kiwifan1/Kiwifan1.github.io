import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-minecraft',
  imports: [CommonModule, RouterLink],
  templateUrl: './minecraft.html',
  styleUrl: './minecraft.css',
})
export class Minecraft {
}
