import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import {
  ProductionChainResult,
  MachineStage,
} from '../../../../models/FissileProductionChain';

export type SulfurPath = 'coal' | 'hcl';

@Component({
  selector: 'app-chain-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chain-flow.html',
  styleUrl: './chain-flow.css',
})
export class ChainFlow {
  @Input({ required: true }) result!: ProductionChainResult;

  sulfurPath = signal<SulfurPath>('coal');

  setSulfurPath(path: SulfurPath): void {
    this.sulfurPath.set(path);
  }

  getStage(name: string): MachineStage | undefined {
    return this.result.stages.find(s => s.name === name);
  }

  machineCount(name: string): number {
    const stage = this.getStage(name);
    return stage?.count ?? 0;
  }

  isBatch(name: string): boolean {
    const stage = this.getStage(name);
    return stage?.type === 'batch';
  }

  formatRate(value: number): string {
    if (value < 0.01) return value.toExponential(2);
    if (value < 1) return value.toFixed(3);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  }
}
