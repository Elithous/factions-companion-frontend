import type { BuildingCatalogue } from './catalogue';
import { getBuildOverlap, getTotalCosts } from './costs';
import { getTotalOutput } from './effects';
import { Building, GameConfig, MultiplierTypes, ResourceCost, ScalingValues } from './types';

/** A current build and the build the player is aiming for. */
export interface BuildComparison {
  currentHq: number;
  currentBuild: Building[];
  goalHq: number;
  goalBuild: Building[];
}

/** The production key that a spend-side resource is refilled by. */
function outputKeyFor(resource: keyof ResourceCost): MultiplierTypes {
  return resource === 'worker' ? 'workers' : resource;
}

/**
 * What the goal build still costs, after crediting everything in the current
 * build that carries over.
 */
export function getRemainingCosts(
  catalogue: BuildingCatalogue | undefined,
  { currentHq, currentBuild, goalHq, goalBuild }: BuildComparison,
  config: GameConfig | undefined,
): ResourceCost {
  const goalCosts = getTotalCosts(catalogue, goalHq, goalBuild, config);
  const reusable = getBuildOverlap(currentBuild, goalBuild);
  const reusableCosts = getTotalCosts(catalogue, Math.min(currentHq, goalHq), reusable, config);

  return {
    wood: goalCosts.wood - reusableCosts.wood,
    iron: goalCosts.iron - reusableCosts.iron,
    worker: goalCosts.worker - reusableCosts.worker,
  };
}

/**
 * Ticks of production needed to afford the goal, per resource.
 *
 * `extraCost` lets callers price a hypothetical change (e.g. "what if I
 * upgraded this building first?") on top of the remaining cost.
 */
export function getTicksToGoal(
  catalogue: BuildingCatalogue | undefined,
  comparison: BuildComparison,
  config: GameConfig | undefined,
  currentResources: ResourceCost,
  extraCost?: ResourceCost,
): ResourceCost {
  const remaining = getRemainingCosts(catalogue, comparison, config);
  const output = getTotalOutput(catalogue, comparison.currentBuild, config);

  const ticks: ResourceCost = { wood: 0, iron: 0, worker: 0 };

  ScalingValues.forEach(resource => {
    const cost = remaining[resource] - currentResources[resource] + (extraCost?.[resource] ?? 0);
    ticks[resource] = Math.ceil(cost / output[outputKeyFor(resource)].final || 0);
  });

  return ticks;
}
