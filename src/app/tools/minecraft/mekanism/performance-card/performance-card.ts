import { Component, Input } from '@angular/core';
import { asNumber, asDecimal } from '../../../../utils/format';
import { FE_TO_JOULES } from '../../../../models/constants';

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

  public formatPower(fePerTick: number): string {
    const joules = fePerTick * FE_TO_JOULES;
    if (joules >= 1_000_000) {
      return asDecimal(joules / 1_000_000, 2) + ' MJ/t';
    }
    if (joules >= 1_000) {
      return asDecimal(joules / 1_000, 2) + ' kJ/t';
    }
    return asDecimal(joules, 2) + ' J/t';
  }
}
