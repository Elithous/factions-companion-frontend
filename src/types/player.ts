/** Shapes returned by the backend's player report endpoints. */

export type BuildActivityType =
  | 'building_built'
  | 'building_upgraded'
  | 'building_destroyed'
  | 'hq_upgraded';

export type PersonalActivityType = 'talent_picked' | 'spec_picked' | 'personal_project_picked';

export interface BuildActivity {
  type: BuildActivityType;
  name: string;
  level: number;
  timestamp: number;
}

/** Career total and per-game average. */
export interface StatSummary {
  /** Career total, across every game regardless of what the average counts. */
  total: number;
  average: number;
  /** Games the average is computed over. */
  countedGames: number;
}

export type CareerTotalKey =
  | 'soldiers' | 'workers' | 'resources' | 'wood' | 'iron'
  | 'supports' | 'knight' | 'guardian' | 'mapBuildings';

export type CareerTotals = Record<CareerTotalKey, StatSummary>;

/** A player's career profile: rating and record, plus contribution totals. */
export interface PlayerProfile {
  playerId: number;
  name: string;
  names: string[];
  avatarUrl: string | null;
  lastSeen: number | null;
  /** Their rating, shown as MMR. Null when upstream was unreachable. */
  score: number | null;
  gamesPlayed: number;
  gamesWon: number;
  /** Games where they were best player. */
  mvps: number;
  clan: { id: number; name: string; tagline: string } | null;
  /** Games played as each faction colour, from our own activity log. */
  factionCounts: Record<string, number>;
  totals: CareerTotals;
  refreshedAt: number;
  /** True when only local data is present. */
  upstreamUnavailable: boolean;
}

/** One effect a project node grants. Shapes vary; all fields are optional. */
export interface NodeEffect {
  type?: string;
  subtype?: string;
  base?: number;
  bonus?: number;
  multiplier?: number;
}

export interface PersonalActivity {
  type: PersonalActivityType;
  name: string;
  category: string;
  tier: number;
  timestamp: number;
  /** 1-based position in the order this type's picks were taken. */
  order: number;
  /**
   * The project node this pick resolved to, or null.
   *
   * A pick records only a translation key and a tier, which several nodes can
   * share, so resolution replays the picks and narrows by prerequisite.
   */
  nodeId: number | null;
  /** The prerequisite node, when known — this is the real dependency link. */
  parentId: number | null;
  effects: NodeEffect[];
  /** True when several nodes matched and none could be ruled out. */
  ambiguous: boolean;
}

export interface PlayerStats {
  playerId: number;
  /** Latest known name, for display. */
  playerName: string;
  buildActivities: BuildActivity[];
  personalActivities: PersonalActivity[];
}

/**
 * One player in the cross-game index.
 *
 * Keyed on the stable player id — usernames change between games and even
 * mid-game, so `name` is only ever a label. `names` holds every alias this id
 * has used so the picker can still be searched by an older one.
 */
export interface PlayerIdentity {
  playerId: number;
  /** Most recently seen username. */
  name: string;
  /** Every username this id has used, newest first. Includes `name`. */
  names: string[];
  /** How many games this player shows up in. */
  games: number;
  /** Newest game they appear in. */
  latestGameId: string;
  /** Unix seconds of their most recent recorded activity. */
  lastSeen: number;
}

export interface ResourcesSpent {
  wood: number;
  iron: number;
  workers: number;
}

/** Village state derived from replaying a player's build activities. */
export interface VillageStats {
  level: number;
  totalCount: number;
  buildingCount: number;
  specialSlots: string;
  resourcesSpent: ResourcesSpent;
}

/** All instances of one building type, grouped for display. */
export interface BuildingGroup {
  name: string;
  imageUrl?: string;
  totalCount: number;
  production?: string;
  levelBreakdown: Array<{ level: number; count: number }>;
  resourcesSpent: ResourcesSpent;
}
