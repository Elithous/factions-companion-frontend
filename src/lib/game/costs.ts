import { BuildingData, HqData } from './buildings.data';
import { BASE_COST_MULTI } from './config';
import { Building, BuildingNameType, CostEntry, GameConfig, ResourceCost, ScalingTypes } from './types';

const ZERO_COST: ResourceCost = { wood: 0, iron: 0, worker: 0 };

function emptyCost(): ResourceCost {
  return { ...ZERO_COST };
}

/**
 * The cost of one level, given a cost curve and the effective per-resource
 * multiplier. Shared by buildings and the HQ — they differ only in which
 * `cost_multi` bucket they read and where their level exponent starts.
 */
function costForLevel(
  curve: { readonly [key in ScalingTypes]: CostEntry },
  level: number,
  levelOffset: number,
  multipliers: ResourceCost | undefined,
  config: GameConfig | undefined,
): ResourceCost {
  const costs = emptyCost();

  for (const costType of Object.keys(curve) as ScalingTypes[]) {
    if (level < curve[costType].start) continue;

    let costMulti = multipliers?.[costType] || 1;
    if (config?.useCostChange) costMulti *= config.costChange;

    const totalCostMulti = BASE_COST_MULTI * costMulti;
    costs[costType] = Math.floor(curve[costType].value * Math.pow(totalCostMulti, level - levelOffset));
  }

  return costs;
}

/** Cost of taking a single building of `type` to `level` (not cumulative). */
export function getBuildingCost(
  type: BuildingNameType,
  level: number,
  config: GameConfig | undefined,
): ResourceCost {
  const data = BuildingData.find(bData => bData.name === type);
  if (!data) throw new Error(`Building data not found: ${type}`);

  return costForLevel(data.cost, level, 1, config?.cost_multi?.building, config);
}

/** Cost of taking the HQ to `hqLevel` (not cumulative). */
export function getHqCost(hqLevel: number, config: GameConfig | undefined): ResourceCost {
  if (hqLevel < 2) return emptyCost();
  return costForLevel(HqData.cost, hqLevel, 2, config?.cost_multi?.hq, config);
}

/** Cumulative cost of every HQ level up to and including `hqLevel`. */
export function getTotalHqCost(hqLevel: number, config: GameConfig | undefined): ResourceCost {
  const costs = emptyCost();

  for (let level = 2; level <= hqLevel; level++) {
    const levelCost = getHqCost(level, config);
    costs.wood += levelCost.wood;
    costs.iron += levelCost.iron;
    costs.worker += levelCost.worker;
  }

  return costs;
}

/** Cumulative cost of an entire build: the HQ plus every building level. */
export function getTotalCosts(
  hqLevel: number,
  buildings: Building[],
  config: GameConfig | undefined,
): ResourceCost {
  const costs = getTotalHqCost(hqLevel, config);
  if (!buildings?.length) return costs;

  buildings.forEach(building => {
    if (!building.type) return;

    for (let level = 1; level <= building.level; level++) {
      const levelCost = getBuildingCost(building.type, level, config);
      costs.wood += levelCost.wood * building.count;
      costs.iron += levelCost.iron * building.count;
      costs.worker += levelCost.worker * building.count;
    }
  });

  return costs;
}

function sortBuildings(a: Building, b: Building): number {
  if (!b.type) return -1;
  if (!a.type) return 1;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  if (a.level !== b.level) return a.level > b.level ? -1 : 1;
  if (a.count !== b.count) return a.count > b.count ? -1 : 1;
  return 0;
}

/**
 * The portion of `start` that carries over into `end` — i.e. buildings that
 * are already paid for and don't need rebuilding to reach the goal.
 */
export function getBuildOverlap(start: Building[], end: Building[]): Building[] {
  const overlap: Building[] = [];

  const startCopy = start.map(value => ({ ...value })).sort(sortBuildings);
  let endCopy = end.map(value => ({ ...value })).sort(sortBuildings);

  for (let index = 0; index < startCopy.length; index++) {
    const building = startCopy[index];
    // Skip undefined/empty buildings.
    if (!building.type || building.count === 0 || building.level === 0) continue;

    const match = endCopy.find(value => value.type === building.type);
    if (!match) continue; // No match found, no overlap.

    const overlapCount = Math.min(building.count, match.count);

    overlap.push({
      id: building.id,
      type: building.type,
      count: overlapCount,
      level: Math.min(building.level, match.level),
    });

    // Consume what we just matched, then re-check this stack if any remains.
    building.count -= overlapCount;
    match.count -= overlapCount;
    endCopy = endCopy.filter(value => value.count > 0);
    if (building.count > 0) index--;
  }

  return overlap;
}
