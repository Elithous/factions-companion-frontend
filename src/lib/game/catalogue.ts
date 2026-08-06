/**
 * The building catalogue, as served by the backend.
 *
 * Buildings are game-specific — added and retired between games, with costs that
 * shift per economy — so nothing here is hardcoded. Everything that used to come
 * from a compiled-in table now arrives through `getBuildingCatalogue`.
 */

import type { CostEntry, ResourceCost, ScalingTypes, StorageTypes } from './types';

export type BuildingCost = { readonly [key in ScalingTypes]: CostEntry };

export interface BuildingEffect {
  type: string;
  subtype?: string;
  base?: number;
  bonus?: number;
  multiplier?: number;
  perLevel?: boolean;
}

export interface CatalogueBuilding {
  name: string;
  /** May be empty — not every building belongs to a category. */
  category: string[];
  cost: BuildingCost;
  /** Minimum HQ level required to place it. */
  hq: number;
  baseEffects: BuildingEffect[];
  tiers: number;
  unique: boolean;
  requires: string | null;
  destructible: boolean;
  upgradeable: boolean;
  maxCount: number | null;
  shape: string | null;
}

export interface BuildingCatalogue {
  /** Which game's config these numbers came from. */
  gameId: string;
  /** True when no game was requested and the newest was used. */
  isDefault: boolean;
  buildings: CatalogueBuilding[];
  hq: {
    cost: BuildingCost;
    baseEffects: BuildingEffect[];
  };
  baseStorage: { readonly [key in StorageTypes]: number };
  baseHqWoodOutput: number;
}

/** An empty catalogue, for rendering before the fetch resolves. */
export const EMPTY_CATALOGUE: BuildingCatalogue = {
  gameId: '',
  isDefault: true,
  buildings: [],
  hq: {
    cost: {
      wood: { value: 0, start: 0 },
      iron: { value: 0, start: 0 },
      worker: { value: 0, start: 0 },
    },
    baseEffects: [],
  },
  baseStorage: { wood: 0, iron: 0, soldiers: 0, workers: 0 },
  baseHqWoodOutput: 0,
};

export function findBuilding(
  catalogue: BuildingCatalogue | undefined,
  name: string | null | undefined,
): CatalogueBuilding | undefined {
  if (!catalogue || !name) return undefined;
  return catalogue.buildings.find(building => building.name === name);
}

/** Picker options, in catalogue order. */
export function toBuildingOptions(catalogue: BuildingCatalogue | undefined) {
  return (catalogue?.buildings ?? []).map(building => ({
    value: building.name,
    label: building.name,
  }));
}

const ZERO_COST: ResourceCost = { wood: 0, iron: 0, worker: 0 };

export const emptyCost = (): ResourceCost => ({ ...ZERO_COST });
