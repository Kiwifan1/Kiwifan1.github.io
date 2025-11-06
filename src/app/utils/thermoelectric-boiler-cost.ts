import { computeShellBreakdown, ShellBreakdown } from './structure-shell';

export interface ThermoelectricBoilerCostOptions {
  width?: number;
  height?: number;
  length?: number;
  valves?: number;
}

export interface ThermoelectricBoilerCost {
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
  shell: ShellBreakdown;
  valves: number;
  waterCavityHeight: number;
  steamCavityHeight: number;
  pressureDispersers: number;
  superheatingElements: number;
  waterVolume: number;
  steamVolume: number;
}

const STEAM_NON_LIMIT_BOUND = (H: number) => Math.floor((21 * H + 2) / 23);

function clampCandidateHeight(height: number, candidate: number): number {
  const upper = Math.max(height - 1, 2);
  const lower = 2;
  return Math.min(Math.max(candidate, lower), upper);
}

function calculateSuperheaters(h: number, area: number): number {
  if (h <= 1) {
    return 0;
  }
  const numerator = (h - 1) * area;
  return Math.ceil(numerator / 21);
}

export function calculateThermoelectricBoilerCost(
  options: ThermoelectricBoilerCostOptions = {}
): ThermoelectricBoilerCost {
  const width = Math.max(options.width ?? 18, 3);
  const height = Math.max(options.height ?? 18, 4);
  const length = Math.max(options.length ?? 18, 3);

  const valves = Math.max(options.valves ?? 1, 0);

  const area = width * length;
  let hCandidate = clampCandidateHeight(height, STEAM_NON_LIMIT_BOUND(height));

  let superheaters = calculateSuperheaters(hCandidate, area);
  while (hCandidate > 2 && superheaters >= (hCandidate - 1) * area) {
    hCandidate -= 1;
    superheaters = calculateSuperheaters(hCandidate, area);
  }

  const waterCavityHeight = Math.max(hCandidate - 1, 0);
  const steamCavityHeight = Math.max(height - hCandidate, 0);

  const pressureDispersers = Math.max((width - 2) * (length - 2), 0);

  const waterVolume = Math.max(waterCavityHeight * area - superheaters, 0);
  const steamVolume = steamCavityHeight * area;

  const shell = computeShellBreakdown(width, height, length, valves);

  return {
    dimensions: { width, height, length },
    shell,
    valves,
    waterCavityHeight,
    steamCavityHeight,
    pressureDispersers,
    superheatingElements: superheaters,
    waterVolume,
    steamVolume,
  };
}
