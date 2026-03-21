import { Component, Input } from '@angular/core';
import { asNumber } from '../../../../utils/format';

@Component({
  selector: 'app-performance-card',
  standalone: true,
  templateUrl: './performance-card.html',
  styleUrl: './performance-card.css',
})
export class PerformanceCard {
  @Input({ required: true }) burnRate!: number;
  @Input({ required: true }) safeBurnRate!: number;
  @Input({ required: true }) steamDemand!: number;
  @Input({ required: true }) powerPerTick!: number;
  @Input() waterDemand?: number;

  public format(value: number): string {
    return asNumber(value);
  }
}
