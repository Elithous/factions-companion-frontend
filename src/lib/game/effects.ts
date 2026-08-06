import { findBuilding, type BuildingCatalogue } from './catalogue';
import { defaultConfig } from './config';
import {
  Building,
  EffectKind,
  GameConfig,
  ModifierMap,
  MultiplierMap,
  MultiplierTypes,
  MultiplierValues,
  StorageTypes,
  StorageValues,
  TotalsMap,
  WorldEffectTypes,
  WorldEffectValues,
} from './types';

/** One entry from a building's `baseEffects` array, loosely typed. */
type BaseEffect = {
  type: string;
  subtype: string;
  base?: number;
  bonus?: number;
  multiplier?: number;
};

/** Walk every effect of every building in a build, per the game's catalogue. */
function forEachEffect(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  visit: (effect: BaseEffect, building: Building) => void,
) {
  buildings.forEach(building => {
    findBuilding(catalogue, building.type)?.baseEffects
      .forEach(effect => visit(effect as BaseEffect, building));
  });
}

function neutralModifiers<K extends string>(keys: readonly K[]): ModifierMap<K> {
  return Object.fromEntries(keys.map(key => [key, { bonus: 0, multiplier: 1 }])) as ModifierMap<K>;
}

function zeroTotals<K extends string>(keys: readonly K[]): TotalsMap<K> {
  return Object.fromEntries(keys.map(key => [key, { base: 0, final: 0 }])) as TotalsMap<K>;
}

/**
 * Sum the additive (`bonus`) and multiplicative (`multiplier`) modifiers that a
 * build contributes to one effect bucket. Modifiers scale with both the number
 * of buildings in a stack and their level.
 *
 * Replaces the three near-identical `getTotal*Modifiers` functions.
 */
export function getTotalModifiers<K extends string>(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  kind: EffectKind,
  keys: readonly K[],
): ModifierMap<K> {
  const totalMods = neutralModifiers(keys);

  forEachEffect(catalogue, buildings, (effect, building) => {
    if (effect.type !== kind) return;
    const subtype = effect.subtype as K;
    if (!(subtype in totalMods)) return;

    const scale = building.count * building.level;
    if (typeof effect.bonus === 'number') {
      totalMods[subtype].bonus += effect.bonus * scale;
    }
    if (typeof effect.multiplier === 'number') {
      totalMods[subtype].multiplier *= 1 + (effect.multiplier - 1) * scale;
    }
  });

  return totalMods;
}

/** Fold a build's own modifiers into the player's configured multipliers. */
function applyModifiers<K extends string>(
  multipliers: MultiplierMap<K>,
  modifiers: ModifierMap<K>,
  keys: readonly K[],
): MultiplierMap<K> {
  const merged = structuredClone(multipliers);
  keys.forEach(key => {
    merged[key].percent += modifiers[key].bonus;
    merged[key].final *= modifiers[key].multiplier;
  });
  return merged;
}

/**
 * Sum the flat (`base`) effects a build produces for one bucket, applying the
 * matching percent and final multipliers to get the `final` column.
 */
function accumulateBaseEffects<K extends string>(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  kind: EffectKind,
  keys: readonly K[],
  multipliers: MultiplierMap<K>,
  seed: TotalsMap<K>,
): TotalsMap<K> {
  const totals = seed;

  forEachEffect(catalogue, buildings, (effect, building) => {
    if (effect.type !== kind || typeof effect.base !== 'number') return;
    const subtype = effect.subtype as K;
    if (!(subtype in totals)) return;

    const multis = multipliers[subtype];
    const baseEffect = effect.base * building.count * building.level;

    totals[subtype].base += baseEffect;
    totals[subtype].final += baseEffect * (1 + (multis?.percent ?? 0) / 100) * (multis?.final ?? 1);
  });

  return totals;
}

/** Per-tick production of a build, before and after multipliers. */
export function getTotalOutput(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  config: GameConfig | undefined,
): TotalsMap<MultiplierTypes> {
  const modifiers = getTotalModifiers(catalogue, buildings, 'production', MultiplierValues);
  const multipliers = applyModifiers(
    (config ?? defaultConfig).prod_multi,
    modifiers,
    MultiplierValues,
  );

  const totals = zeroTotals(MultiplierValues);

  // The HQ produces wood on its own, before any buildings are counted.
  const hqMulti = multipliers.wood;
  const hqWood = catalogue?.baseHqWoodOutput ?? 0;
  totals.wood.base += hqWood;
  totals.wood.final += hqWood * (1 + (hqMulti?.percent ?? 0) / 100) * (hqMulti?.final ?? 1);

  return accumulateBaseEffects(catalogue, buildings, 'production', MultiplierValues, multipliers, totals);
}

/** Storage capacity of a build, before and after multipliers. */
export function getTotalStorage(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  config: GameConfig | undefined,
): TotalsMap<StorageTypes> {
  const modifiers = getTotalModifiers(catalogue, buildings, 'storage', StorageValues);
  const multipliers = applyModifiers(
    (config ?? defaultConfig).storage_multi,
    modifiers,
    StorageValues,
  );

  const totals = zeroTotals(StorageValues);

  // Base village storage, present before any buildings are placed.
  // NOTE: the percent term is added rather than applied as a percentage here.
  // This mirrors the original implementation exactly; it looks like a bug but
  // is preserved so displayed numbers don't shift during the refactor.
  StorageValues.forEach(value => {
    const multis = multipliers[value];
    const base = catalogue?.baseStorage[value] ?? 0;
    totals[value].base += base;
    totals[value].final += (base + (multis?.percent ?? 0) / 100) * (multis?.final ?? 1);
  });

  return accumulateBaseEffects(catalogue, buildings, 'storage', StorageValues, multipliers, totals);
}

/**
 * Flat world-map bonuses (attack %, defense %, ...) contributed by a build.
 * These are additive percentages, so only the `bonus` half is meaningful.
 */
export function getTotalWorldEffects(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
): { [key in WorldEffectTypes]: number } {
  const modifiers = getTotalModifiers(catalogue, buildings, 'world', WorldEffectValues);

  return Object.fromEntries(
    WorldEffectValues.map(key => [key, modifiers[key].bonus]),
  ) as { [key in WorldEffectTypes]: number };
}

/**
 * Effective attack/defense soldier counts: raw soldier output scaled by the
 * build's own world bonuses plus the player's configured world multipliers.
 */
export function getEffectiveCombatStrength(
  catalogue: BuildingCatalogue | undefined,
  buildings: Building[],
  config: GameConfig,
) {
  const soldiers = getTotalOutput(catalogue, buildings, config).soldiers.final;
  const worldEffects = getTotalWorldEffects(catalogue, buildings);

  const effectiveFor = (kind: 'attack' | 'defense') => {
    const { percent, final } = config.world_multi[kind];
    return soldiers * (1 + (worldEffects[kind] + percent) / 100) * final;
  };

  return {
    soldiers,
    attack: effectiveFor('attack'),
    defense: effectiveFor('defense'),
  };
}
