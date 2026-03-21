import { BoilerDimensions, TurbineDimensions } from './cooling-requirements';
import { IndustrialTurbine } from '../models/IndustrialTurbine';
import { PowerOptimization } from '../models/TurbinePowerOptimization';
import { ThermoelectricBoiler } from '../models/ThermoelectricBoiler';
import { ThermoelectricBoilerOptimization } from '../models/ThermoelectricBoilerOptimization';
import { BOILER } from '../models/constants';

const HEAT_TO_STEAM_RATIO =
  ThermoelectricBoiler.STEAM_PER_SUPERHEATER / BOILER.SUPERHEATING_HEAT_TRANSFER;

export function selectTurbineDimensions(steamDemand: number, waterDemand: number): TurbineDimensions {
  const fallback: TurbineDimensions = {
    length: IndustrialTurbine.MIN_LENGTH,
    height: IndustrialTurbine.MIN_HEIGHT,
  };

  if (steamDemand <= 0 && waterDemand <= 0) {
    return fallback;
  }

  let best: { score: number[]; dims: TurbineDimensions } | null = null;

  for (
    let length = IndustrialTurbine.MIN_LENGTH;
    length <= IndustrialTurbine.MAX_LENGTH;
    length += 1
  ) {
    if (length % 2 === 0) {
      continue;
    }
    const maxHeight = Math.min(IndustrialTurbine.MAX_HEIGHT, 2 * length - 1);
    let foundOptimalForLength = false;
    for (let height = IndustrialTurbine.MIN_HEIGHT; height <= maxHeight; height += 1) {
      let evaluation;
      try {
        evaluation = PowerOptimization.findOptimalDesign(length, height);
      } catch (err) {
        void err;
        continue;
      }

      const metrics = evaluation.optimal;
      if (metrics.effectiveSteamFlow <= 0 || metrics.waterFlow <= 0) {
        continue;
      }

      const steamUnits = steamDemand > 0 ? Math.ceil(steamDemand / metrics.effectiveSteamFlow) : 0;
      const waterUnits = waterDemand > 0 ? Math.ceil(waterDemand / metrics.waterFlow) : 0;
      const count = Math.max(steamUnits, waterUnits, 1);
      const area = length * length;
      const score = [count, area, height];
      if (!best || compareScores(score, best.score) < 0) {
        best = { score, dims: { length, height } };
      }

      if (count === 1) {
        foundOptimalForLength = true;
        break;
      }
    }

    if (foundOptimalForLength && best?.dims.length === length) {
      break;
    }
  }

  return best?.dims ?? fallback;
}

export function selectBoilerDimensions(heatDemand: number, steamDemand: number): BoilerDimensions {
  const fallback: BoilerDimensions = {
    width: ThermoelectricBoiler.MIN_WIDTH,
    length: ThermoelectricBoiler.MIN_LENGTH,
    height: ThermoelectricBoiler.MIN_HEIGHT,
  };

  if (heatDemand <= 0 && steamDemand <= 0) {
    return fallback;
  }

  let best: { score: number[]; dims: BoilerDimensions } | null = null;

  for (
    let width = ThermoelectricBoiler.MIN_WIDTH;
    width <= ThermoelectricBoiler.MAX_WIDTH;
    width += 1
  ) {
    for (let length = width; length <= ThermoelectricBoiler.MAX_LENGTH; length += 1) {
      const area = width * length;

      for (
        let height = ThermoelectricBoiler.MIN_HEIGHT;
        height <= ThermoelectricBoiler.MAX_HEIGHT;
        height += 1
      ) {
        let optimal;
        try {
          optimal = ThermoelectricBoilerOptimization.findOptimalConfiguration(
            width,
            length,
            height
          ).optimal;
        } catch (err) {
          void err;
          continue;
        }

        const perBoilerSteam = optimal.production.limit;
        if (perBoilerSteam <= 0) {
          continue;
        }

        const perBoilerHeat = Math.min(
          optimal.superheaters * BOILER.SUPERHEATING_HEAT_TRANSFER,
          perBoilerSteam / HEAT_TO_STEAM_RATIO
        );
        if (perBoilerHeat <= 0) {
          continue;
        }

        const steamUnits = steamDemand > 0 ? Math.ceil(steamDemand / perBoilerSteam) : 0;
        const heatUnits = heatDemand > 0 ? Math.ceil(heatDemand / perBoilerHeat) : 0;
        const count = Math.max(steamUnits, heatUnits, 1);
        const aspectDelta = Math.abs(length - width);
        const score = [count, aspectDelta, area, height];

        if (!best || compareScores(score, best.score) < 0) {
          best = { score, dims: { width, length, height } };
        }

        if (count === 1 && aspectDelta === 0) {
          break;
        }
      }
    }
  }

  return best?.dims ?? fallback;
}

function compareScores(a: number[], b: number[]): number {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i += 1) {
    const delta = a[i] - b[i];
    if (delta !== 0) {
      return delta;
    }
  }
  return a.length - b.length;
}
