import type { BuildingNameType } from './buildings.data';

/**
 * Core value/type definitions for the game domain.
 * Pure types and constants only — no logic, no data tables.
 */

/** Resources that a build consumes. */
export const ScalingValues = ['wood', 'iron', 'worker'] as const;
export type ScalingTypes = typeof ScalingValues[number];

/** Per-tick outputs a village can produce. */
export const MultiplierValues = ['wood', 'iron', 'workers', 'soldiers', 'knight', 'guardian'] as const;
export type MultiplierTypes = typeof MultiplierValues[number];

/** Things a village can store. */
export const StorageValues = ['wood', 'iron', 'soldiers', 'workers'] as const;
export type StorageTypes = typeof StorageValues[number];

/** Bonuses that apply on the world map rather than in the village. */
export const WorldEffectValues = ['attack', 'defense', 'guardianPower', 'knightPower', 'worker'] as const;
export type WorldEffectTypes = typeof WorldEffectValues[number];

/** The three effect buckets a building can contribute to. */
export type EffectKind = 'production' | 'storage' | 'world';

/** A `{ percent, final }` pair, keyed by some effect subtype. */
export type MultiplierMap<K extends string> = { [key in K]: { final: number; percent: number } };

/** A `{ bonus, multiplier }` pair, keyed by some effect subtype. */
export type ModifierMap<K extends string> = { [key in K]: { bonus: number; multiplier: number } };

/** A `{ base, final }` pair, keyed by some effect subtype. */
export type TotalsMap<K extends string> = { [key in K]: { base: number; final: number } };

export type ResourceCost = { [key in ScalingTypes]: number };

/** Cost curve entry: a base `value` that only starts applying at level `start`. */
export interface CostEntry {
  value: number;
  start: number;
}

export interface GameConfig {
  cost_multi: {
    building: ResourceCost;
    hq: ResourceCost;
  };
  prod_multi: MultiplierMap<MultiplierTypes>;
  storage_multi: MultiplierMap<StorageTypes>;
  world_multi: MultiplierMap<WorldEffectTypes>;
  /** Simulate an across-the-board change to cost scaling. */
  useCostChange: boolean;
  costChange: number;
}

/** A stack of identical buildings within a build plan. */
export interface Building {
  id: number;
  type: BuildingNameType | null;
  count: number;
  level: number;
  sortOrder?: number;
}

/** Re-exported so consumers only need one import for the building types. */
export type { BuildingNameType };
