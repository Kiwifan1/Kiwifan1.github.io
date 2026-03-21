import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ShellBreakdown } from '../../../../models/Shell';
import { asNumber } from '../../../../utils/format';

export interface ConstructionItem {
  label: string;
  value: number;
}

export interface GeometryNote {
  label: string;
  value: number;
}

@Component({
  selector: 'app-construction-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './construction-summary.html',
  styleUrl: './construction-summary.css',
})
export class ConstructionSummary {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) shell!: ShellBreakdown;
  @Input({ required: true }) items!: ConstructionItem[];
  @Input() geometryNotes?: GeometryNote[];

  public format(value: number): string {
    return asNumber(value);
  }
}
