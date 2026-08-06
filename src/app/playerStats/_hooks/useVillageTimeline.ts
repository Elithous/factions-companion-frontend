"use client";

import { useMemo } from "react";

import type { BuildActivity, BuildingGroup, PlayerStats, VillageStats } from "@/types/player";

const NO_RESOURCES = { wood: 0, iron: 0, workers: 0 };

/** HQ level every player starts at. */
const STARTING_HQ_LEVEL = 4;

export const DEFAULT_VILLAGE: VillageStats = {
  level: STARTING_HQ_LEVEL,
  totalCount: STARTING_HQ_LEVEL,
  buildingCount: 0,
  specialSlots: "0/0",
  resourcesSpent: { ...NO_RESOURCES },
};

/**
 * Which instance a demolition refers to.
 *
 * A demolition records the level the building *was* at, unlike an upgrade whose
 * level is the one it's moving to. Prefer an exact match; if the recorded level
 * doesn't line up with anything standing — or wasn't recorded at all — fall back
 * to the closest, then to the most recent. The building is gone either way, and
 * leaving it standing is a worse error than removing a slightly wrong instance.
 */
function findDemolishedInstance(instances: number[], level: number | null): number {
  if (!instances.length) return -1;

  if (typeof level === 'number') {
    const exact = instances.indexOf(level);
    if (exact !== -1) return exact;

    let closest = 0;
    instances.forEach((instanceLevel, index) => {
      if (Math.abs(instanceLevel - level) < Math.abs(instances[closest] - level)) {
        closest = index;
      }
    });
    return closest;
  }

  return instances.length - 1;
}

/**
 * Replay the build log up to `step` and return the levels of each standing
 * building, keyed by name. Each array entry is one instance of that building.
 */
function replayBuildings(activities: BuildActivity[]) {
  const buildings: Record<string, number[]> = {};
  let hqLevel = STARTING_HQ_LEVEL;
  let buildingCount = 0;

  for (const activity of activities) {
    if (activity.type === 'hq_upgraded') {
      hqLevel = activity.level;
      continue;
    }
    if (!activity.name) continue;

    const instances = (buildings[activity.name] ??= []);

    switch (activity.type) {
      case 'building_built':
        instances.push(1);
        buildingCount++;
        break;

      case 'building_upgraded': {
        // An upgrade's level is the one being moved *to*, so the instance to
        // bump is the one sitting a level below it.
        const index = instances.indexOf(activity.level - 1);
        if (index !== -1) instances[index]++;
        break;
      }

      case 'building_destroyed': {
        const index = findDemolishedInstance(instances, activity.level);
        if (index !== -1) {
          instances.splice(index, 1);
          buildingCount--;
        }
        break;
      }
    }
  }

  return { buildings, hqLevel, buildingCount };
}

function toBuildingGroups(buildings: Record<string, number[]>): BuildingGroup[] {
  return Object.entries(buildings)
    .filter(([, levels]) => levels.length > 0)
    .map(([name, levels]) => {
      const levelCounts = levels.reduce<Record<number, number>>((counts, level) => {
        counts[level] = (counts[level] || 0) + 1;
        return counts;
      }, {});

      return {
        name,
        totalCount: levels.length,
        levelBreakdown: Object.keys(levelCounts)
          .map(Number)
          .map(level => ({ level, count: levelCounts[level] })),
        resourcesSpent: { ...NO_RESOURCES },
      };
    });
}

/**
 * Village composition as of a given point in a player's build history.
 * `step` is an index into `playerStats.buildActivities`, inclusive.
 */
export function useVillageTimeline(playerStats: PlayerStats | null, step: number) {
  return useMemo(() => {
    if (!playerStats) {
      return { villageStats: DEFAULT_VILLAGE, buildingGroups: [] as BuildingGroup[] };
    }

    const { buildings, hqLevel, buildingCount } = replayBuildings(
      playerStats.buildActivities.slice(0, step + 1),
    );

    return {
      villageStats: {
        level: hqLevel,
        buildingCount,
        totalCount: hqLevel,
        specialSlots: '0/0',
        resourcesSpent: { ...NO_RESOURCES },
      },
      buildingGroups: toBuildingGroups(buildings),
    };
  }, [playerStats, step]);
}
