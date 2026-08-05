"use client";

import { useCallback } from "react";

import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Building, GameConfig } from "@/lib/game";
import { isValidConfig } from "@/lib/game";

const STORAGE_KEYS = {
  BUILD: 'calculator_build',
  CONFIG: 'calculator_config',
} as const;

/** The current/goal build pair, as persisted and as exported. */
export interface BuildPlan {
  currentHq: number;
  currentBuild: Building[];
  goalHq: number;
  goalBuild: Building[];
}

export interface ExportData extends BuildPlan {
  config: GameConfig | undefined;
}

const DEFAULT_PLAN: BuildPlan = {
  currentHq: 5,
  currentBuild: [],
  goalHq: 5,
  goalBuild: [],
};

function isBuildPlan(value: unknown): value is BuildPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<BuildPlan>;
  return (
    typeof plan.currentHq === 'number' &&
    typeof plan.goalHq === 'number' &&
    Array.isArray(plan.currentBuild) &&
    Array.isArray(plan.goalBuild)
  );
}

/** Merge identical type+level stacks into one, renumbering ids. */
export function condenseBuildings(buildings: Building[]): Building[] {
  const grouped: Record<string, Building> = {};

  buildings.forEach(building => {
    if (!building.type) return; // Skip buildings with no type.

    const key = `${building.type}-${building.level}`;
    if (grouped[key]) {
      grouped[key].count += building.count;
    } else {
      grouped[key] = { ...building };
    }
  });

  return Object.values(grouped).map((building, index) => ({ ...building, id: index + 1 }));
}

/**
 * Owns the calculator's build state: the current and goal builds, the game
 * config, and persistence of both to localStorage.
 */
export function useBuildPlan() {
  const [plan, setPlan] = useLocalStorageState<BuildPlan>(STORAGE_KEYS.BUILD, DEFAULT_PLAN, isBuildPlan);
  const [config, setConfig] = useLocalStorageState<GameConfig | undefined>(
    STORAGE_KEYS.CONFIG,
    undefined,
    isValidConfig,
  );

  const update = useCallback(
    (patch: Partial<BuildPlan>) => setPlan(prev => ({ ...prev, ...patch })),
    [setPlan],
  );

  /** Copy one side of the plan onto the other. */
  const copyBuild = useCallback((direction: 'forward' | 'backward') => {
    setPlan(prev =>
      direction === 'forward'
        ? { ...prev, goalBuild: structuredClone(prev.currentBuild), goalHq: prev.currentHq }
        : { ...prev, currentBuild: structuredClone(prev.goalBuild), currentHq: prev.goalHq },
    );
  }, [setPlan]);

  const condense = useCallback((side: 'current' | 'goal') => {
    setPlan(prev =>
      side === 'current'
        ? { ...prev, currentBuild: condenseBuildings(prev.currentBuild) }
        : { ...prev, goalBuild: condenseBuildings(prev.goalBuild) },
    );
  }, [setPlan]);

  const toExportData = useCallback(
    (): ExportData => ({ ...plan, config }),
    [plan, config],
  );

  /** Apply pasted export data. Throws if the payload is unusable. */
  const applyImport = useCallback((raw: string) => {
    const imported = JSON.parse(raw) as Partial<ExportData>;

    // Older exports predate the goal build.
    const merged: BuildPlan = {
      currentHq: imported.currentHq ?? plan.currentHq,
      currentBuild: imported.currentBuild ?? plan.currentBuild,
      goalHq: imported.goalHq ?? plan.goalHq,
      goalBuild: imported.goalBuild ?? plan.goalBuild,
    };

    if (!isBuildPlan(merged) || !merged.currentHq || !merged.goalHq) {
      throw new Error('Invalid import data: missing required fields');
    }

    setPlan(merged);
    if (isValidConfig(imported.config)) setConfig(imported.config);
  }, [plan, setPlan, setConfig]);

  return { plan, update, config, setConfig, copyBuild, condense, toExportData, applyImport };
}
