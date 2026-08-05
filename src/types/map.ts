import type { StaticImageData } from 'next/image';

/** Available factions in the game. */
export type Faction = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';

export interface Position {
  x: number;
  y: number;
}

/** A single tile on the heatmap. */
export interface MapTileModel {
  /** Colour weight (0-1) for heatmap display. */
  weight?: number;
}

export interface MapTilesListModel {
  [x: number]: {
    [y: number]: MapTileModel;
  };
}

/** Everything the map component needs to render. */
export interface MapModel {
  dimensions: { width: number; height: number };
  tiles: MapTilesListModel;
  image?: StaticImageData;
}

export interface TerrainBonus {
  type: string;
  subtype: string;
  /** Flat bonus. */
  base: number;
  /** Additive percentage bonus. */
  bonus: number;
  /** Multiplicative percentage bonus. */
  multiplier: number;
}

/** Map metadata as returned by the backend. */
export interface MapConfig {
  author: string;
  name: string;
  description: string;

  width: number;
  height: number;

  /** Bonus provided to units near their home base. */
  home_bonus: number;
  /** Radius around home bases where the bonus applies. */
  home_radius: number;

  hqs_positions: Record<Faction, Position>;
  /** Terrain bonuses by tile type. */
  terrains_bonus: Record<string, TerrainBonus[]>;
  /** Events that are not allowed on this map. */
  forbidden_events: string[];
  /** Terrain types that are not passable on this map. */
  forbidden_terrain_types: string[];
}
