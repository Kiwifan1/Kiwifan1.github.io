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

  /**
   * For the HCl/Gunpowder alt path, compute machine counts based on
   * the sulfur demand from the main chain (same SO₂ requirement).
   *
   * Brine ES: 10 mB Brine → 1 mB Cl + 1 mB Na. Throughput = 2 × 2^speed.
   * Water ES: 2 mB Water → 2 mB H₂ + 1 mB O₂. Throughput = 3 × 2^speed.
   * CI (HCl): 1 mB H₂ + 1 mB Cl → 1 mB HCl. Throughput = 1 × 2^speed.
   * CIC: batch machine, ~100 ticks base. 1 Gunpowder + HCl → 1 Sulfur.
   */
  altPathMachineCount(machine: 'es-brine' | 'es-water' | 'ci-hcl' | 'cic'): number {
    // Sulfur demand = same as Chemical Oxidizer (SO₂) ops/t in the main chain
    const oxSO2 = this.getStage('Chemical Oxidizer (Sulfur Dioxide)');
    const sulfurDemand = oxSO2 && oxSO2.type === 'batch' ? oxSO2.opsPerTick : 0;
    if (sulfurDemand <= 0) return 1;

    const speed = this.result.speedUpgrades;
    const throughputMultiplier = Math.pow(2, speed);

    switch (machine) {
      case 'cic': {
        // Batch: ~100 base ticks, 1 sulfur per op
        const effTicks = Math.ceil(100 * Math.pow(10, -speed / 8));
        return Math.max(1, Math.ceil(sulfurDemand / (1 / effTicks)));
      }
      case 'ci-hcl': {
        // 1 mB HCl per recipe, need sulfurDemand mB/t HCl (1:1 with sulfur via CIC)
        // CIC uses some amount of HCl per sulfur — assume 1 mB HCl per sulfur
        const hclNeeded = sulfurDemand; // rough estimate
        return Math.max(1, Math.ceil(hclNeeded / (1 * throughputMultiplier)));
      }
      case 'es-brine': {
        // 1 mB Cl per 10 mB Brine. Need hclNeeded mB/t Cl.
        const clNeeded = sulfurDemand;
        return Math.max(1, Math.ceil(clNeeded / (1 * throughputMultiplier)));
      }
      case 'es-water': {
        // 2 mB H₂ per 2 mB Water. Need hclNeeded mB/t H₂.
        const h2Needed = sulfurDemand;
        return Math.max(1, Math.ceil(h2Needed / (2 * throughputMultiplier)));
      }
    }
  }

  formatRate(value: number): string {
    if (value < 0.01) return value.toExponential(2);
    if (value < 1) return value.toFixed(3);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  }
}
