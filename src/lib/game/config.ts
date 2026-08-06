import {
  GameConfig,
  MultiplierMap,
  MultiplierValues,
  StorageValues,
  WorldEffectValues,
} from './types';

/**
 * Base exponent applied to every cost curve, before any per-game multipliers.
 * Single source of truth — the config page and the calculator both read this.
 */
export const BASE_COST_MULTI = 1.5;

function neutralMultipliers<K extends string>(keys: readonly K[]): MultiplierMap<K> {
  return Object.fromEntries(
    keys.map(key => [key, { final: 1, percent: 0 }])
  ) as MultiplierMap<K>;
}

export const defaultConfig: GameConfig = {
  cost_multi: {
    building: { wood: 1, iron: 1, worker: 1 },
    hq: { wood: 1, iron: 1, worker: 1 },
  },
  prod_multi: neutralMultipliers(MultiplierValues),
  storage_multi: neutralMultipliers(StorageValues),
  world_multi: neutralMultipliers(WorldEffectValues),
  useCostChange: false,
  costChange: 0,
};

export function createDefaultConfig(): GameConfig {
  return structuredClone(defaultConfig);
}

/**
 * Shape check for configs coming from localStorage or a pasted import —
 * they may have been written by an older version of the app.
 */
export function isValidConfig(value: unknown): value is GameConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as GameConfig;

  const hasMultipliers = <K extends string>(map: MultiplierMap<K> | undefined, keys: readonly K[]) =>
    !!map && keys.every(key => map[key]?.final !== undefined && map[key]?.percent !== undefined);

  try {
    const costKeys = ['wood', 'iron', 'worker'] as const;
    const hasCosts =
      costKeys.every(key => config.cost_multi?.building?.[key] !== undefined) &&
      costKeys.every(key => config.cost_multi?.hq?.[key] !== undefined);

    return (
      hasCosts &&
      hasMultipliers(config.prod_multi, MultiplierValues) &&
      hasMultipliers(config.storage_multi, StorageValues) &&
      hasMultipliers(config.world_multi, WorldEffectValues)
    );
  } catch {
    return false;
  }
}

/** Raw shape returned by the backend's `report/games/config` endpoint. */
/**
 * One entry of the game config's `buildings` array.
 *
 * The normalised form served by `report/games/buildings` is what the app
 * actually consumes — see `./catalogue`. This raw shape is only what the game
 * config itself carries.
 */
export interface ApiBuildingConfig {
  name: string;
  /** May be empty: not every building belongs to a category. */
  category: string[];
  shape?: string;
  tiers?: number;
  maxCount?: number | null;
  upgradeable?: boolean;
  destructible?: boolean;
}

export interface ApiGameConfig {
  misc: {
    parameters: {
      building_iron_cost_multiplier: number;
      building_wood_cost_multiplier: number;
      building_worker_cost_multiplier: number;
      hq_iron_cost_multiplier: number;
      hq_wood_cost_multiplier: number;
      hq_worker_cost_multiplier: number;
    };
  };
  buildings?: ApiBuildingConfig[];
  mapConfig?: unknown;
}

/**
 * Translate the backend's flat parameter list into a `GameConfig`, keeping
 * whatever non-cost multipliers the caller already had configured.
 */
export function configFromApi(api: ApiGameConfig | undefined, base: GameConfig = defaultConfig): GameConfig {
  const params = api?.misc?.parameters;

  return {
    cost_multi: {
      building: {
        wood: params?.building_wood_cost_multiplier ?? 1,
        iron: params?.building_iron_cost_multiplier ?? 1,
        worker: params?.building_worker_cost_multiplier ?? 1,
      },
      hq: {
        wood: params?.hq_wood_cost_multiplier ?? 1,
        iron: params?.hq_iron_cost_multiplier ?? 1,
        worker: params?.hq_worker_cost_multiplier ?? 1,
      },
    },
    prod_multi: base.prod_multi ?? defaultConfig.prod_multi,
    storage_multi: base.storage_multi ?? defaultConfig.storage_multi,
    world_multi: base.world_multi ?? defaultConfig.world_multi,
    useCostChange: base.useCostChange,
    costChange: base.costChange,
  };
}
