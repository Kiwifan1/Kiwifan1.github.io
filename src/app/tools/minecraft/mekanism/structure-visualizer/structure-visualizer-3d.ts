import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoilerSupportPlan, TurbineSupportPlan } from '../../../../utils/cooling-requirements';
import { CELL_COLORS, LegendEntry, StructureMode } from './structure-layers';
import { StructureBlock, StructureVolume, buildStructureVolume } from './structure-volume';

@Component({
  selector: 'app-structure-visualizer-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './structure-visualizer-3d.html',
  styleUrl: './structure-visualizer-3d.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructureVisualizer3d implements AfterViewInit, OnDestroy, OnChanges {
  @Input({ required: true })
  public mode: StructureMode = 'turbine';

  @Input()
  public turbine: TurbineSupportPlan | null = null;

  @Input()
  public boiler: BoilerSupportPlan | null = null;

  @ViewChild('canvas', { static: true })
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('viewport', { static: true })
  private viewportRef?: ElementRef<HTMLDivElement>;

  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver?: ResizeObserver;
  private animationHandle: number | null = null;
  private initialized = false;
  private readonly handleDoubleClick = () => this.resetView();

  private readonly scene = new THREE.Scene();
  private readonly structureGroup = new THREE.Group();
  private cleanupNeeded = false;
  private gridHelper: THREE.GridHelper | null = null;

  private readonly volume = signal<StructureVolume | null>(null);
  public readonly legend = computed(() => this.volume()?.legend ?? []);
  public readonly hasVolume = computed(() => (this.volume()?.blocks.length ?? 0) > 0);
  public readonly showWalls = signal(false);
  public readonly showOutlines = signal(true);
  public readonly showGrid = signal(true);

  constructor() {
    this.scene.background = new THREE.Color('#0f1012');
    this.scene.add(this.structureGroup);
  }

  public ngAfterViewInit(): void {
    this.initialized = true;
    this.setupRenderer();
    this.attachResizeObserver();
    this.rebuildVolume();
    this.startAnimationLoop();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }
    if (changes['mode'] || changes['turbine'] || changes['boiler']) {
      this.rebuildVolume();
    }
  }

  public ngOnDestroy(): void {
    this.animationHandle && cancelAnimationFrame(this.animationHandle);
    this.controls?.dispose();
    this.renderer?.dispose();
    this.resizeObserver?.disconnect();
    this.canvasRef?.nativeElement.removeEventListener('dblclick', this.handleDoubleClick);
    this.disposeGrid();
    this.teardownStructure();
  }

  public legendColor(entry: LegendEntry): string {
    return CELL_COLORS[entry.type] ?? '#cccccc';
  }

  private setupRenderer(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio ?? 1);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.set(8, 12, 10);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.zoomSpeed = 0.6;
    this.controls.rotateSpeed = 0.6;
    canvas.addEventListener('dblclick', this.handleDoubleClick);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const directional = new THREE.DirectionalLight(0xffffff, 0.85);
    directional.position.set(5, 12, 8);
    this.scene.add(ambient, directional);
  }

  private attachResizeObserver(): void {
    const element = this.viewportRef?.nativeElement;
    if (!element || !this.renderer || !this.camera) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.syncViewportSize());
    this.resizeObserver.observe(element);
    this.syncViewportSize();
  }

  private syncViewportSize(): void {
    if (!this.viewportRef || !this.renderer || !this.camera) {
      return;
    }
    const rect = this.viewportRef.nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  private startAnimationLoop(): void {
    const render = () => {
      this.animationHandle = requestAnimationFrame(render);
      this.controls?.update();
      if (this.renderer && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    render();
  }

  private rebuildVolume(): void {
    const volume = buildStructureVolume(this.mode, this.turbine, this.boiler);
    this.volume.set(volume);
    this.teardownStructure();
    if (!volume || volume.blocks.length === 0) {
      this.disposeGrid();
      return;
    }
    this.populateStructure(volume);
    this.positionCamera(volume);
    this.updateGrid(volume);
  }

  private resetView(): void {
    const volume = this.volume();
    if (!volume) {
      return;
    }
    this.positionCamera(volume);
  }

  private populateStructure(volume: StructureVolume): void {
    const solidsByType = new Map<string, StructureBlock[]>();
    const outlinesByType = new Map<string, StructureBlock[]>();
    volume.blocks.forEach((block) => {
      if (this.shouldRenderSolidBlock(block.type)) {
        const solidBucket = solidsByType.get(block.type);
        if (solidBucket) {
          solidBucket.push(block);
        } else {
          solidsByType.set(block.type, [block]);
        }
      }

      const outlineBucket = outlinesByType.get(block.type);
      if (outlineBucket) {
        outlineBucket.push(block);
      } else {
        outlinesByType.set(block.type, [block]);
      }
    });

    const offsetX = (volume.width - 1) / 2;
    const offsetY = (volume.height - 1) / 2;
    const offsetZ = (volume.length - 1) / 2;
    const matrix = new THREE.Matrix4();

    const outlinesEnabled = this.showOutlines();
    solidsByType.forEach((blocks, type) => {
      const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
      const color = CELL_COLORS[type as keyof typeof CELL_COLORS] ?? '#ffffff';
      const isShell = type === 'casing';
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.55,
        metalness: 0.15,
        transparent: isShell,
        opacity: isShell ? 0.45 : 1,
        depthWrite: !isShell,
      });
      const mesh = new THREE.InstancedMesh(baseGeometry, material, blocks.length);
      blocks.forEach((block, index) => {
        matrix.makeTranslation(block.x - offsetX, block.y - offsetY, block.z - offsetZ);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.structureGroup.add(mesh);
    });

    if (outlinesEnabled) {
      outlinesByType.forEach((blocks, type) => {
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const edgeTemplate = new THREE.EdgesGeometry(boxGeometry);
        boxGeometry.dispose();
        const geometries: THREE.BufferGeometry[] = [];
        blocks.forEach((block) => {
          const instanceGeometry = edgeTemplate.clone();
          matrix.makeTranslation(block.x - offsetX, block.y - offsetY, block.z - offsetZ);
          instanceGeometry.applyMatrix4(matrix);
          geometries.push(instanceGeometry);
        });
        const merged = mergeGeometries(geometries, true);
        edgeTemplate.dispose();
        if (!merged) {
          return;
        }
        const outlineMaterial = new THREE.LineBasicMaterial({
          color: type === 'casing' ? 0xffffff : 0x0f0f0f,
          transparent: true,
          opacity: type === 'casing' ? 0.35 : 0.5,
          depthTest: false,
        });
        const outlineLines = new THREE.LineSegments(merged, outlineMaterial);
        this.structureGroup.add(outlineLines);
      });
    }

    this.cleanupNeeded = solidsByType.size > 0 || (outlinesEnabled && outlinesByType.size > 0);
  }

  private positionCamera(volume: StructureVolume): void {
    if (!this.camera || !this.controls) {
      return;
    }
    const center = new THREE.Vector3(
      0,
      (volume.height - 1) / 2,
      0
    );
    const radius = Math.max(volume.width, volume.length, volume.height) * 0.85;
    this.camera.position.set(center.x + radius, center.y + radius, center.z + radius);
    this.controls.target.copy(center);
    this.controls.update();
  }

  private teardownStructure(): void {
    if (!this.cleanupNeeded) {
      return;
    }
    for (let i = this.structureGroup.children.length - 1; i >= 0; i -= 1) {
      const child = this.structureGroup.children[i];
      if (child instanceof THREE.InstancedMesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.structureGroup.remove(child);
    }
    this.cleanupNeeded = false;
  }

  private updateGrid(volume: StructureVolume): void {
    if (!this.showGrid()) {
      this.disposeGrid();
      return;
    }
    const size = Math.max(volume.width, volume.length) + 2;
    const divisions = size * 2;
    this.disposeGrid();
    const helper = new THREE.GridHelper(size, divisions, 0x4caf50, 0x3a3a3a);
    helper.position.y = -((volume.height - 1) / 2) - 0.5;
    if (Array.isArray(helper.material)) {
      helper.material.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.4;
      });
    } else {
      helper.material.transparent = true;
      helper.material.opacity = 0.4;
    }
    this.scene.add(helper);
    this.gridHelper = helper;
  }

  private disposeGrid(): void {
    if (!this.gridHelper) {
      return;
    }
    this.scene.remove(this.gridHelper);
    this.gridHelper.geometry.dispose();
    if (Array.isArray(this.gridHelper.material)) {
      this.gridHelper.material.forEach((material) => material.dispose());
    } else {
      this.gridHelper.material.dispose();
    }
    this.gridHelper = null;
  }

  private shouldRenderSolidBlock(type: StructureBlock['type']): boolean {
    if (type === 'casing') {
      return this.showWalls();
    }
    return true;
  }

  public onWallToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.showWalls.set(checked);
    this.refreshStructure();
  }

  public onOutlineToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.showOutlines.set(checked);
    this.refreshStructure();
  }

  public onGridToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.showGrid.set(checked);
    const volume = this.volume();
    if (volume && this.initialized) {
      this.updateGrid(volume);
    } else if (!checked) {
      this.disposeGrid();
    }
  }

  private refreshStructure(): void {
    if (!this.initialized) {
      return;
    }
    this.rebuildVolume();
  }
}
