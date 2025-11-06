import { computeShellBreakdown, ShellBreakdown } from './structure-shell';

export interface FissionReactorCostOptions {
  width?: number;
  height?: number;
  length?: number;
  ports?: number;
}

export interface FissionReactorCost {
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
  shell: ShellBreakdown;
  ports: number;
  controlRodColumns: number;
  controlRodAssemblies: number;
  fissileFuelAssemblies: number;
}

export function calculateFissionReactorCost(
  options: FissionReactorCostOptions = {}
): FissionReactorCost {
  const width = Math.max(options.width ?? 18, 3);
  const height = Math.max(options.height ?? 18, 4);
  const length = Math.max(options.length ?? 18, 3);

  const ports = Math.max(options.ports ?? 4, 0);

  const shell = computeShellBreakdown(width, height, length, ports);

  const interiorWidth = Math.max(width - 2, 0);
  const interiorLength = Math.max(length - 2, 0);
  const interiorHeight = Math.max(height - 2, 0);

  const controlRodColumns = interiorWidth * interiorLength;
  const fissileFuelPerColumn = Math.max(interiorHeight - 1, 0);
  const fissileFuelAssemblies = controlRodColumns * fissileFuelPerColumn;
  const controlRodAssemblies = controlRodColumns;

  return {
    dimensions: { width, height, length },
    shell,
    ports,
    controlRodColumns,
    controlRodAssemblies,
    fissileFuelAssemblies,
  };
}
