import { BoilerSupportPlan, TurbineSupportPlan } from '../../../../utils/cooling-requirements';
import {
  BOILER_LEGEND,
  CellType,
  LayerVisual,
  LegendEntry,
  StructureMode,
  TURBINE_LEGEND,
  buildBoilerLayers,
  buildTurbineLayers,
} from './structure-layers';

export interface StructureBlock {
  type: CellType;
  x: number;
  y: number;
  z: number;
}

export interface StructureVolume {
  width: number;
  length: number;
  height: number;
  blocks: StructureBlock[];
  layers: LayerVisual[];
  legend: LegendEntry[];
  mode: StructureMode;
}

export function buildStructureVolume(
  mode: StructureMode,
  turbine: TurbineSupportPlan | null,
  boiler: BoilerSupportPlan | null
): StructureVolume | null {
  if (mode === 'turbine') {
    if (!turbine) {
      return null;
    }
    const layers = buildTurbineLayers(turbine);
    return layersToVolume('turbine', layers, TURBINE_LEGEND);
  }

  if (!boiler) {
    return null;
  }
  const layers = buildBoilerLayers(boiler);
  return layersToVolume('boiler', layers, BOILER_LEGEND);
}

export function layersToVolume(
  mode: StructureMode,
  layers: LayerVisual[],
  legend: LegendEntry[]
): StructureVolume {
  const height = layers.length;
  const length = Math.max(...layers.map((layer) => layer.grid.length), 0);
  const width = Math.max(
    ...layers.map((layer) => (layer.grid[0] ? layer.grid[0].length : 0)),
    0
  );

  const blocks: StructureBlock[] = [];
  layers.forEach((layer, y) => {
    layer.grid.forEach((row, z) => {
      row.forEach((cell, x) => {
        if (cell.type === 'empty') {
          return;
        }
        blocks.push({ type: cell.type, x, y, z });
      });
    });
  });

  return {
    width,
    length,
    height,
    blocks,
    layers,
    legend,
    mode,
  };
}
