import { CommonModule } from '@angular/common';
import {
  Component, ElementRef, HostListener, Input, signal,
  viewChild, afterNextRender, effect, OnDestroy,
} from '@angular/core';
import {
  ProductionChainResult,
  MachineStage,
  BatchMachineStage,
  ChemicalMachineStage,
} from '../../../../models/FissileProductionChain';

export type SulfurPath = 'coal' | 'hcl';

export interface NodeInfo {
  id: string;
  label: string;
  stageName: string;
  path: 'a' | 'b' | 'final';
  connectsTo: string[];
  connectsFrom: string[];
  description: string;
}

export interface ConnectionInfo {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  path: 'a' | 'b' | 'final';
  shape: 'vertical' | 'l-shaped' | 'long-vertical' | 'horizontal';
}

interface RenderedConnection {
  info: ConnectionInfo;
  pathD: string;
  color: string;
  dashed: boolean;
  labelX: number;
  labelY: number;
  labelWidth: number;
  labelAnchor: 'middle' | 'end';
}

@Component({
  selector: 'app-chain-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chain-flow.html',
  styleUrl: './chain-flow.css',
})
export class ChainFlow implements OnDestroy {
  @Input({ required: true }) result!: ProductionChainResult;

  sulfurPath = signal<SulfurPath>('coal');
  hoveredNode = signal<string | null>(null);
  selectedNode = signal<string | null>(null);

  /* SVG overlay state */
  svgWidth = signal(0);
  svgHeight = signal(0);
  renderedConnections = signal<RenderedConnection[]>([]);

  private readonly colorMap: Record<string, string> = {
    a: '#2a862a', b: '#ff9800', final: '#1995ff',
  };

  /** All node definitions for the coal path */
  private readonly coalNodes: NodeInfo[] = [
    {
      id: 'enrichment',
      label: 'Enrichment Chamber',
      stageName: 'Enrichment Chamber',
      path: 'a',
      connectsTo: ['oxidizer-uo'],
      connectsFrom: [],
      description: 'Enriches Uranium Ingots into Yellow Cake Uranium',
    },
    {
      id: 'oxidizer-uo',
      label: 'Chemical Oxidizer (UO)',
      stageName: 'Chemical Oxidizer (Uranium Oxide)',
      path: 'a',
      connectsTo: ['infuser-uf6'],
      connectsFrom: ['enrichment'],
      description: 'Oxidizes Yellow Cake into gaseous Uranium Oxide',
    },
    {
      id: 'es',
      label: 'Electrolytic Separator',
      stageName: 'Electrolytic Separator',
      path: 'b',
      connectsTo: ['infuser-so3', 'prc'],
      connectsFrom: [],
      description: 'Electrolyzes Water into O\u2082 and H\u2082',
    },
    {
      id: 'prc',
      label: 'Pressurized Reaction Chamber',
      stageName: 'Pressurized Reaction Chamber',
      path: 'b',
      connectsTo: ['oxidizer-so2'],
      connectsFrom: ['es'],
      description: 'Combines Coal + Water + O\u2082 to produce Sulfur',
    },
    {
      id: 'oxidizer-so2',
      label: 'Chemical Oxidizer (SO\u2082)',
      stageName: 'Chemical Oxidizer (Sulfur Dioxide)',
      path: 'b',
      connectsTo: ['infuser-so3'],
      connectsFrom: ['prc'],
      description: 'Oxidizes Sulfur Dust into SO\u2082 gas',
    },
    {
      id: 'infuser-so3',
      label: 'Chemical Infuser (SO\u2083)',
      stageName: 'Chemical Infuser (SO\u2083)',
      path: 'b',
      connectsTo: ['infuser-h2so4'],
      connectsFrom: ['oxidizer-so2', 'es'],
      description: 'Combines SO\u2082 + O\u2082 into SO\u2083',
    },
    {
      id: 'rc',
      label: 'Rotary Condensentrator',
      stageName: 'Rotary Condensentrator',
      path: 'b',
      connectsTo: ['infuser-h2so4'],
      connectsFrom: [],
      description: 'Converts liquid Water into Water Vapor gas',
    },
    {
      id: 'infuser-h2so4',
      label: 'Chemical Infuser (H\u2082SO\u2084)',
      stageName: 'Chemical Infuser (H\u2082SO\u2084)',
      path: 'b',
      connectsTo: ['dissolution'],
      connectsFrom: ['infuser-so3', 'rc'],
      description: 'Combines SO\u2083 + Water Vapor into Sulfuric Acid',
    },
    {
      id: 'dissolution',
      label: 'Dissolution Chamber',
      stageName: 'Chemical Dissolution Chamber',
      path: 'b',
      connectsTo: ['infuser-uf6'],
      connectsFrom: ['infuser-h2so4'],
      description: 'Dissolves Fluorite in H\u2082SO\u2084 to produce HF',
    },
    {
      id: 'infuser-uf6',
      label: 'Chemical Infuser (UF\u2086)',
      stageName: 'Chemical Infuser (UF\u2086)',
      path: 'final',
      connectsTo: ['centrifuge'],
      connectsFrom: ['oxidizer-uo', 'dissolution'],
      description: 'Combines Uranium Oxide + HF into UF\u2086',
    },
    {
      id: 'centrifuge',
      label: 'Isotopic Centrifuge',
      stageName: 'Isotopic Centrifuge',
      path: 'final',
      connectsTo: [],
      connectsFrom: ['infuser-uf6'],
      description: 'Enriches UF\u2086 into Fissile Fuel',
    },
  ];

  /** Additional/replacement nodes for the HCl path */
  private readonly hclNodes: NodeInfo[] = [
    {
      id: 'enrichment',
      label: 'Enrichment Chamber',
      stageName: 'Enrichment Chamber',
      path: 'a',
      connectsTo: ['oxidizer-uo'],
      connectsFrom: [],
      description: 'Enriches Uranium Ingots into Yellow Cake Uranium',
    },
    {
      id: 'oxidizer-uo',
      label: 'Chemical Oxidizer (UO)',
      stageName: 'Chemical Oxidizer (Uranium Oxide)',
      path: 'a',
      connectsTo: ['infuser-uf6'],
      connectsFrom: ['enrichment'],
      description: 'Oxidizes Yellow Cake into gaseous Uranium Oxide',
    },
    {
      id: 'evap',
      label: 'Thermal Evap Plant',
      stageName: '',
      path: 'b',
      connectsTo: ['es-brine'],
      connectsFrom: [],
      description: 'Evaporates Water into Brine',
    },
    {
      id: 'es-brine',
      label: 'ES (Brine)',
      stageName: '',
      path: 'b',
      connectsTo: ['ci-hcl'],
      connectsFrom: ['evap'],
      description: 'Separates Brine into Chlorine + Sodium',
    },
    {
      id: 'es-water',
      label: 'ES (Water)',
      stageName: '',
      path: 'b',
      connectsTo: ['ci-hcl'],
      connectsFrom: [],
      description: 'Separates Water into Hydrogen + Oxygen',
    },
    {
      id: 'ci-hcl',
      label: 'Chemical Infuser (HCl)',
      stageName: '',
      path: 'b',
      connectsTo: ['cic'],
      connectsFrom: ['es-brine', 'es-water'],
      description: 'Combines Chlorine + Hydrogen into HCl',
    },
    {
      id: 'cic',
      label: 'Chem. Injection Chamber',
      stageName: '',
      path: 'b',
      connectsTo: ['oxidizer-so2'],
      connectsFrom: ['ci-hcl'],
      description: 'Combines HCl + Gunpowder into Sulfur Dust',
    },
    {
      id: 'oxidizer-so2',
      label: 'Chemical Oxidizer (SO\u2082)',
      stageName: 'Chemical Oxidizer (Sulfur Dioxide)',
      path: 'b',
      connectsTo: ['infuser-so3'],
      connectsFrom: ['cic'],
      description: 'Oxidizes Sulfur Dust into SO\u2082 gas',
    },
    {
      id: 'es',
      label: 'Electrolytic Separator',
      stageName: 'Electrolytic Separator',
      path: 'b',
      connectsTo: ['infuser-so3'],
      connectsFrom: [],
      description: 'Electrolyzes Water into O\u2082 (for SO\u2083)',
    },
    {
      id: 'infuser-so3',
      label: 'Chemical Infuser (SO\u2083)',
      stageName: 'Chemical Infuser (SO\u2083)',
      path: 'b',
      connectsTo: ['infuser-h2so4'],
      connectsFrom: ['oxidizer-so2', 'es'],
      description: 'Combines SO\u2082 + O\u2082 into SO\u2083',
    },
    {
      id: 'rc',
      label: 'Rotary Condensentrator',
      stageName: 'Rotary Condensentrator',
      path: 'b',
      connectsTo: ['infuser-h2so4'],
      connectsFrom: [],
      description: 'Converts liquid Water into Water Vapor gas',
    },
    {
      id: 'infuser-h2so4',
      label: 'Chemical Infuser (H\u2082SO\u2084)',
      stageName: 'Chemical Infuser (H\u2082SO\u2084)',
      path: 'b',
      connectsTo: ['dissolution'],
      connectsFrom: ['infuser-so3', 'rc'],
      description: 'Combines SO\u2083 + Water Vapor into Sulfuric Acid',
    },
    {
      id: 'dissolution',
      label: 'Dissolution Chamber',
      stageName: 'Chemical Dissolution Chamber',
      path: 'b',
      connectsTo: ['infuser-uf6'],
      connectsFrom: ['infuser-h2so4'],
      description: 'Dissolves Fluorite in H\u2082SO\u2084 to produce HF',
    },
    {
      id: 'infuser-uf6',
      label: 'Chemical Infuser (UF\u2086)',
      stageName: 'Chemical Infuser (UF\u2086)',
      path: 'final',
      connectsTo: ['centrifuge'],
      connectsFrom: ['oxidizer-uo', 'dissolution'],
      description: 'Combines Uranium Oxide + HF into UF\u2086',
    },
    {
      id: 'centrifuge',
      label: 'Isotopic Centrifuge',
      stageName: 'Isotopic Centrifuge',
      path: 'final',
      connectsTo: [],
      connectsFrom: ['infuser-uf6'],
      description: 'Enriches UF\u2086 into Fissile Fuel',
    },
  ];

  private readonly coalConnections: ConnectionInfo[] = [
    { id: 'enr->ox-uo', fromNodeId: 'enrichment', toNodeId: 'oxidizer-uo', label: 'Yellow Cake', path: 'a', shape: 'vertical' },
    { id: 'ox-uo->uf6', fromNodeId: 'oxidizer-uo', toNodeId: 'infuser-uf6', label: 'UO', path: 'a', shape: 'long-vertical' },
    { id: 'prc->ox-so2', fromNodeId: 'prc', toNodeId: 'oxidizer-so2', label: 'Sulfur', path: 'b', shape: 'vertical' },
    { id: 'ox-so2->so3', fromNodeId: 'oxidizer-so2', toNodeId: 'infuser-so3', label: 'SO\u2082', path: 'b', shape: 'vertical' },
    { id: 'es->so3', fromNodeId: 'es', toNodeId: 'infuser-so3', label: 'O\u2082', path: 'b', shape: 'l-shaped' },
    { id: 'so3->h2so4', fromNodeId: 'infuser-so3', toNodeId: 'infuser-h2so4', label: 'SO\u2083', path: 'b', shape: 'vertical' },
    { id: 'rc->h2so4', fromNodeId: 'rc', toNodeId: 'infuser-h2so4', label: 'H\u2082O Vapor', path: 'b', shape: 'l-shaped' },
    { id: 'h2so4->diss', fromNodeId: 'infuser-h2so4', toNodeId: 'dissolution', label: 'H\u2082SO\u2084', path: 'b', shape: 'vertical' },
    { id: 'fluorite->diss', fromNodeId: 'input-fluorite', toNodeId: 'dissolution', label: 'Fluorite', path: 'b', shape: 'horizontal' },
    { id: 'diss->uf6', fromNodeId: 'dissolution', toNodeId: 'infuser-uf6', label: 'HF', path: 'b', shape: 'l-shaped' },
    { id: 'uf6->cent', fromNodeId: 'infuser-uf6', toNodeId: 'centrifuge', label: 'UF\u2086', path: 'final', shape: 'vertical' },
  ];

  private readonly hclConnections: ConnectionInfo[] = [
    { id: 'enr->ox-uo', fromNodeId: 'enrichment', toNodeId: 'oxidizer-uo', label: 'Yellow Cake', path: 'a', shape: 'vertical' },
    { id: 'ox-uo->uf6', fromNodeId: 'oxidizer-uo', toNodeId: 'infuser-uf6', label: 'UO', path: 'a', shape: 'long-vertical' },
    { id: 'evap->es-br', fromNodeId: 'evap', toNodeId: 'es-brine', label: 'Brine', path: 'b', shape: 'vertical' },
    { id: 'es-br->ci', fromNodeId: 'es-brine', toNodeId: 'ci-hcl', label: 'Cl\u2082', path: 'b', shape: 'vertical' },
    { id: 'es-w->ci', fromNodeId: 'es-water', toNodeId: 'ci-hcl', label: 'H\u2082', path: 'b', shape: 'l-shaped' },
    { id: 'ci->cic', fromNodeId: 'ci-hcl', toNodeId: 'cic', label: 'HCl', path: 'b', shape: 'vertical' },
    { id: 'gp->cic', fromNodeId: 'input-gunpowder', toNodeId: 'cic', label: 'Gunpowder', path: 'b', shape: 'l-shaped' },
    { id: 'cic->ox-so2', fromNodeId: 'cic', toNodeId: 'oxidizer-so2', label: 'Sulfur', path: 'b', shape: 'vertical' },
    { id: 'ox-so2->so3', fromNodeId: 'oxidizer-so2', toNodeId: 'infuser-so3', label: 'SO\u2082', path: 'b', shape: 'vertical' },
    { id: 'es->so3', fromNodeId: 'es', toNodeId: 'infuser-so3', label: 'O\u2082', path: 'b', shape: 'l-shaped' },
    { id: 'so3->h2so4', fromNodeId: 'infuser-so3', toNodeId: 'infuser-h2so4', label: 'SO\u2083', path: 'b', shape: 'vertical' },
    { id: 'rc->h2so4', fromNodeId: 'rc', toNodeId: 'infuser-h2so4', label: 'H\u2082O Vapor', path: 'b', shape: 'l-shaped' },
    { id: 'h2so4->diss', fromNodeId: 'infuser-h2so4', toNodeId: 'dissolution', label: 'H\u2082SO\u2084', path: 'b', shape: 'vertical' },
    { id: 'fluorite->diss-hcl', fromNodeId: 'input-fluorite-hcl', toNodeId: 'dissolution', label: 'Fluorite', path: 'b', shape: 'horizontal' },
    { id: 'diss->uf6-hcl', fromNodeId: 'dissolution', toNodeId: 'infuser-uf6', label: 'HF', path: 'b', shape: 'l-shaped' },
    { id: 'uf6->cent-hcl', fromNodeId: 'infuser-uf6', toNodeId: 'centrifuge', label: 'UF\u2086', path: 'final', shape: 'vertical' },
  ];

  get connections(): ConnectionInfo[] {
    return this.sulfurPath() === 'coal' ? this.coalConnections : this.hclConnections;
  }

  private resizeObserver: ResizeObserver | null = null;

  constructor(private elRef: ElementRef) {
    afterNextRender(() => {
      this.calculateConnections();
      this.setupResizeObserver();
    });

    effect(() => {
      this.sulfurPath(); // track signal
      // Double rAF ensures the @if block's new DOM has rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.calculateConnections());
      });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    const grid = this.elRef.nativeElement.querySelector('.wf__grid--coal, .wf__grid--hcl');
    if (!grid) return;
    this.resizeObserver = new ResizeObserver(() => this.calculateConnections());
    this.resizeObserver.observe(grid);
  }

  calculateConnections(): void {
    const grid = this.elRef.nativeElement.querySelector('.wf__grid--coal, .wf__grid--hcl') as HTMLElement;
    if (!grid) { this.renderedConnections.set([]); return; }

    const gridRect = grid.getBoundingClientRect();
    this.svgWidth.set(grid.scrollWidth);
    this.svgHeight.set(grid.scrollHeight);

    const rendered: RenderedConnection[] = [];
    for (const conn of this.connections) {
      const fromEl = grid.querySelector(`[data-node-id="${conn.fromNodeId}"]`) as HTMLElement;
      const toEl = grid.querySelector(`[data-node-id="${conn.toNodeId}"]`) as HTMLElement;
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Source: bottom-center
      const sx = fromRect.left + fromRect.width / 2 - gridRect.left;
      const sy = fromRect.bottom - gridRect.top;

      let pathD: string;
      let labelX: number;
      let labelY: number;
      let labelAnchor: 'middle' | 'end' = 'middle';

      if (conn.shape === 'horizontal') {
        const fromX = fromRect.left - gridRect.left - 4;
        const fromY = fromRect.top + fromRect.height / 2 - gridRect.top;
        const tx = toRect.right - gridRect.left + 4;
        const ty = toRect.top + toRect.height / 2 - gridRect.top;
        pathD = `M ${fromX} ${fromY} L ${tx} ${ty}`;
        labelX = (fromX + tx) / 2;
        labelY = Math.min(fromY, ty) - 10;
      } else if (conn.shape === 'l-shaped') {
        const tx = toRect.right - gridRect.left + 4;
        const ty = toRect.top + toRect.height / 2 - gridRect.top;
        const elbowY = ty;
        pathD = `M ${sx} ${sy} L ${sx} ${elbowY} L ${tx} ${elbowY}`;
        labelX = (sx + tx) / 2;
        labelY = elbowY - 10;
      } else {
        // Vertical: use text-anchor="end" so text grows leftward from the anchor
        const tx = toRect.left + toRect.width / 2 - gridRect.left;
        const ty = toRect.top - gridRect.top;
        pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
        labelAnchor = 'end';
        labelX = Math.min(sx, tx) - 8;
        labelY = (sy + ty) / 2 + 4;
      }

      rendered.push({
        info: conn,
        pathD,
        color: this.colorMap[conn.path],
        dashed: conn.shape === 'long-vertical',
        labelX,
        labelY,
        labelWidth: conn.label.length * 7 + 8,
        labelAnchor,
      });
    }
    this.renderedConnections.set(rendered);
  }

  onConnHover(conn: ConnectionInfo): void {
    this.hoveredNode.set(conn.fromNodeId);
  }

  get nodes(): NodeInfo[] {
    return this.sulfurPath() === 'coal' ? this.coalNodes : this.hclNodes;
  }

  setSulfurPath(path: SulfurPath): void {
    this.sulfurPath.set(path);
    this.selectedNode.set(null);
    this.hoveredNode.set(null);
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

  nodeCount(nodeId: string): number | string {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 0;

    // Alt-path machines use altPathMachineCount
    const altIds = ['es-brine', 'es-water', 'ci-hcl', 'cic'];
    if (altIds.includes(nodeId)) {
      return this.altPathMachineCount(nodeId as 'es-brine' | 'es-water' | 'ci-hcl' | 'cic');
    }

    // Thermal evap is a structure, not a counted machine
    if (nodeId === 'evap') return 'tower';

    if (node.stageName) {
      return this.machineCount(node.stageName);
    }
    return 0;
  }

  /**
   * For the HCl/Gunpowder alt path, compute machine counts based on
   * the sulfur demand from the main chain (same SO2 requirement).
   */
  altPathMachineCount(machine: 'es-brine' | 'es-water' | 'ci-hcl' | 'cic'): number {
    const oxSO2 = this.getStage('Chemical Oxidizer (Sulfur Dioxide)');
    const sulfurDemand = oxSO2 && oxSO2.type === 'batch' ? oxSO2.opsPerTick : 0;
    if (sulfurDemand <= 0) return 1;

    const speed = this.result.speedUpgrades;
    const throughputMultiplier = Math.pow(2, speed);

    switch (machine) {
      case 'cic': {
        const effTicks = Math.ceil(100 * Math.pow(10, -speed / 8));
        return Math.max(1, Math.ceil(sulfurDemand / (1 / effTicks)));
      }
      case 'ci-hcl': {
        const hclNeeded = sulfurDemand;
        return Math.max(1, Math.ceil(hclNeeded / (1 * throughputMultiplier)));
      }
      case 'es-brine': {
        const clNeeded = sulfurDemand;
        return Math.max(1, Math.ceil(clNeeded / (1 * throughputMultiplier)));
      }
      case 'es-water': {
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

  // -- Interactivity --

  onNodeHover(nodeId: string): void {
    this.hoveredNode.set(nodeId);
  }

  onNodeLeave(): void {
    this.hoveredNode.set(null);
  }

  onNodeClick(nodeId: string): void {
    if (this.selectedNode() === nodeId) {
      this.selectedNode.set(null);
    } else {
      this.selectedNode.set(nodeId);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.selectedNode() === null) return;
    const target = event.target as HTMLElement;
    // If click is outside the waterfall container, dismiss popover
    if (!this.elRef.nativeElement.contains(target)) {
      this.selectedNode.set(null);
    }
  }

  /** Check if a node should be highlighted (connected to hovered node) */
  isNodeHighlighted(nodeId: string): boolean {
    const hovered = this.hoveredNode();
    if (!hovered) return false;
    if (nodeId === hovered) return true;
    const hoveredInfo = this.nodes.find(n => n.id === hovered);
    if (!hoveredInfo) return false;
    return hoveredInfo.connectsTo.includes(nodeId) || hoveredInfo.connectsFrom.includes(nodeId);
  }

  /** Check if a connection line should be highlighted */
  isConnectionHighlighted(fromId: string, toId: string): boolean {
    const hovered = this.hoveredNode();
    if (!hovered) return false;
    return hovered === fromId || hovered === toId;
  }

  /** Get selected node detail info */
  getSelectedNodeInfo(): { node: NodeInfo; stage: MachineStage | undefined; count: number | string } | null {
    const id = this.selectedNode();
    if (!id) return null;
    const node = this.nodes.find(n => n.id === id);
    if (!node) return null;
    const stage = node.stageName ? this.getStage(node.stageName) : undefined;
    return { node, stage, count: this.nodeCount(id) };
  }

  /** Format energy with units */
  formatEnergy(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' MFE/t';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' kFE/t';
    return value.toFixed(1) + ' FE/t';
  }

  /** Get throughput display for a stage */
  getThroughput(stage: MachineStage): string {
    if (stage.type === 'batch') {
      return this.formatRate(stage.opsPerTick) + ' ops/t';
    }
    return this.formatRate(stage.flowRateMbPerTick) + ' mB/t';
  }
}
