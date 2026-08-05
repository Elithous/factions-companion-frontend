"use client";

import { useMemo } from "react";

import { GameConfig, ResourceCost, getRemainingCosts, getTicksToGoal } from "@/lib/game";

import type { BuildPlan } from "./useBuildPlan";

export interface BuildRequirements {
  /** Still-outstanding cost of the goal build, per resource. */
  remainingCosts: ResourceCost;
  /** Ticks needed per resource. */
  ticks: ResourceCost;
  /** Ticks until every resource is covered — the slowest one wins. */
  totalTicks: number;
}

/** Cost and time still standing between the current build and the goal build. */
export function useBuildRequirements(
  plan: BuildPlan,
  config: GameConfig | undefined,
  currentResources: ResourceCost,
): BuildRequirements | null {
  return useMemo(() => {
    if (!config) return null;

    const remainingCosts = getRemainingCosts(plan, config);
    const ticks = getTicksToGoal(plan, config, currentResources);

    return {
      remainingCosts,
      ticks,
      totalTicks: Math.max(ticks.wood, ticks.iron, ticks.worker, 0),
    };
  }, [plan, config, currentResources]);
}
