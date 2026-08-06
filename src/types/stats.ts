import type { Position } from './map';

/** Soldier totals keyed by sending faction, then receiving faction. */
export interface ToFromFaction {
  [fromFaction: string]: {
    [toFaction: string]: number;
  };
}

/** Soldier totals keyed by tile x, then y. */
export interface TileTotals {
  [x: string]: {
    [y: string]: number;
  };
}

export type FactionColor = 'blue' | 'green' | 'red' | 'yellow';

export type UnitType = 'soldiers' | 'workers' | 'special';

/** Active filters on the stats page. Every field is optional / unset by default. */
export interface StatsFilter {
  type?: UnitType;
  tile?: Position;
  /**
   * Stable player id. Filtering on the username would miss half the activity of
   * anyone who renamed partway through a game.
   */
  playerId?: number;
  /** Latest known name for `playerId`, for display only. */
  playerName?: string;
  fromFaction?: FactionColor;
  toFaction?: FactionColor;
  dateRange?: [number, number];
}

/* -------------------------------------------------------------------------- */
/* Tile drill-down                                                            */
/* -------------------------------------------------------------------------- */

/** Faction as stored by the backend — uppercase, plus the two unowned states. */
export type TileFaction = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'NEUTRAL' | 'UNOWNED';

export interface TileSupportTypeEntry {
  supportType: string;
  faction: TileFaction;
  count: number;
  units: number;
  kills: number;
  power: number;
}

export interface TileSupportPlayerEntry {
  player: string;
  faction: TileFaction;
  count: number;
  units: number;
  kills: number;
  power: number;
}

export interface TileSupportSummary {
  totalEvents: number;
  totalUnits: number;
  totalKills: number;
  byType: TileSupportTypeEntry[];
  byPlayer: TileSupportPlayerEntry[];
}

export interface TileOwnershipSegment {
  faction: TileFaction;
  player: string | null;
  startTime: number;
  endTime: number;
  seconds: number;
  capturedFrom: TileFaction | null;
  capturedBy: string | null;
}

export interface TileOwnershipFactionEntry {
  faction: TileFaction;
  seconds: number;
  percent: number;
  captures: number;
  longestHoldSeconds: number;
}

export interface TileOwnershipSummary {
  windowStart: number;
  windowEnd: number;
  trackedSeconds: number;
  /** Changes credited to a player fighting for the new owner. */
  totalCaptures: number;
  /** Every change of hands, including resets to neutral/unowned. */
  totalChanges: number;
  currentFaction: TileFaction | null;
  currentPlayer: string | null;
  /** Who held the tile at the start of the game, derived from terrain. */
  startingFaction: TileFaction;
  terrain: string | null;
  byFaction: TileOwnershipFactionEntry[];
  segments: TileOwnershipSegment[];
  dateFiltered: boolean;
}

export interface TileLootFactionEntry {
  faction: TileFaction;
  vp: number;
  loots: number;
  players: number;
}

export interface TileLootPlayerEntry {
  player: string;
  playerId: number | null;
  faction: TileFaction;
  vp: number;
  loots: number;
  firstLoot: number | null;
  lastLoot: number | null;
}

/** Looting against an HQ tile — shown in place of ownership on those tiles. */
export interface TileLootSummary {
  hqFaction: TileFaction;
  totalVp: number;
  totalLoots: number;
  firstLoot: number | null;
  lastLoot: number | null;
  byFaction: TileLootFactionEntry[];
  byPlayer: TileLootPlayerEntry[];
}

export interface TilePlayerEntry {
  player: string;
  playerId: number | null;
  faction: TileFaction;
  soldiersAttack: number;
  soldiersDefend: number;
  soldiersTotal: number;
  attacks: number;
  defends: number;
  captures: number;
  supportSent: number;
  workersSent: number;
  actions: number;
  firstAction: number | null;
  lastAction: number | null;
}

export interface TileBuildingKillSource {
  /** Building's own tile. Null when the payload didn't expose it. */
  x: number | null;
  y: number | null;
  building: string;
  faction: TileFaction;
  activations: number;
  soldiersDestroyed: number;
  /** Chebyshev distance from the selected tile. */
  distance: number | null;
}

export interface TileBuildingKillSummary {
  totalActivations: number;
  totalSoldiersDestroyed: number;
  unknownSourceCount: number;
  sources: TileBuildingKillSource[];
}

export interface TileWorkerProjectEntry {
  activityType: string;
  projectType: string;
  events: number;
  workers: number;
}

export interface TileWorkerPlayerEntry {
  player: string;
  faction: TileFaction;
  events: number;
  workers: number;
}

export interface TileWorkerSummary {
  totalEvents: number;
  totalWorkers: number;
  fortificationWorkers: number;
  improvementWorkers: number;
  dismantleWorkers: number;
  byProject: TileWorkerProjectEntry[];
  byPlayer: TileWorkerPlayerEntry[];
}

/** Everything the tile drill-down panel renders. */
export interface TileDetail {
  tile: Position;
  activityCount: number;
  terrain: string | null;
  support: TileSupportSummary;
  /** Null on HQ tiles, which report `loot` instead. */
  ownership: TileOwnershipSummary | null;
  /** Only set when the tile holds a faction HQ. */
  loot: TileLootSummary | null;
  players: TilePlayerEntry[];
  buildingKills: TileBuildingKillSummary;
  workers: TileWorkerSummary;
}
