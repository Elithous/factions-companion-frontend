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
  playerName?: string;
  fromFaction?: FactionColor;
  toFaction?: FactionColor;
  dateRange?: [number, number];
}
