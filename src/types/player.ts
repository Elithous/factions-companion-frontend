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

export interface PersonalActivity {
  type: PersonalActivityType;
  name: string;
  category: string;
  tier: number;
  timestamp: number;
}

export interface PlayerStats {
  playerName: string;
  buildActivities: BuildActivity[];
  personalActivities: PersonalActivity[];
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
