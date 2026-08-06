import { useMemo } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Building,
  BuildingCatalogue,
  GameConfig,
  ResourceCost,
  ScalingValues,
  getBuildingCost,
  getTicksToGoal,
} from "@/lib/game";

import type { BuildPlan } from "../_hooks/useBuildPlan";

interface BuildTipsProps {
  plan: BuildPlan;
  currentResources: ResourceCost;
  config: GameConfig | undefined;
  /** The selected game's catalogue; costs are read from it. */
  catalogue: BuildingCatalogue | undefined;
}

interface UpgradeTip {
  building: Building;
  upgradeCost: ResourceCost;
  /** Change in ticks-to-goal if this building were levelled up first. */
  tickImpact: ResourceCost;
}

const RESOURCE_LABELS: { [key in keyof ResourceCost]: string } = {
  wood: 'Wood',
  iron: 'Iron',
  worker: 'Workers',
};

const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

/**
 * For each building in the current build, shows what levelling it up one step
 * would cost and whether that brings the goal build closer or pushes it away.
 */
export default function BuildTips({ plan, currentResources, config, catalogue }: BuildTipsProps) {
  const tips = useMemo<UpgradeTip[]>(() => {
    if (!config) return [];

    const baseTicks = getTicksToGoal(catalogue, plan, config, currentResources);

    return plan.currentBuild.flatMap(building => {
      if (!building.type) return [];

      // Price the upgrade, then re-run the projection with it applied.
      const perBuilding = getBuildingCost(catalogue, building.type, building.level + 1, config);
      const upgradeCost: ResourceCost = {
        wood: perBuilding.wood * building.count,
        iron: perBuilding.iron * building.count,
        worker: perBuilding.worker * building.count,
      };

      const upgradedBuild = plan.currentBuild.map(b =>
        b.id === building.id ? { ...b, level: b.level + 1 } : b,
      );

      const testTicks = getTicksToGoal(
        catalogue,
        { ...plan, currentBuild: upgradedBuild },
        config,
        currentResources,
        upgradeCost,
      );

      return [{
        building,
        upgradeCost,
        tickImpact: {
          wood: testTicks.wood - baseTicks.wood,
          iron: testTicks.iron - baseTicks.iron,
          worker: testTicks.worker - baseTicks.worker,
        },
      }];
    });
  }, [plan, currentResources, config]);

  if (!tips.length) return null;

  return (
    <div className="build-tips">
      <p className="mb-4 text-lg font-bold">Build Tips</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Building</TableHead>
            <TableHead>Cost Impact</TableHead>
            <TableHead>Tick Impact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tips.map(({ building, upgradeCost, tickImpact }) => (
            <TableRow key={building.id}>
              <TableCell>
                <p className="font-bold">{building.type}</p>
                <p className="text-sm">Level: {building.level} → {building.level + 1}</p>
                <p className="text-sm">Count: {building.count}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">Cost Impact:</p>
                {ScalingValues.map(resource => (
                  <p key={resource} className="text-sm">
                    {RESOURCE_LABELS[resource]}: {upgradeCost[resource]}
                  </p>
                ))}
              </TableCell>
              <TableCell>
                <p className="text-sm">Tick Impact:</p>
                {ScalingValues.map(resource => (
                  <p
                    key={resource}
                    className={cn("text-sm", tickImpact[resource] > 0 ? 'text-destructive' : 'text-success')}
                  >
                    {RESOURCE_LABELS[resource]}: {signed(tickImpact[resource])}
                  </p>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
