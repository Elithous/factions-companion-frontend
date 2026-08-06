import type { Faction } from './map';

/** Upstream game lifecycle states, plus null when the index doesn't list it. */
export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'PLAYING' | 'COMPLETED';

/** A game as shown in the picker, before you open it. */
export interface GameSummary {
  id: string;
  /** Game mode, e.g. STANDARD or SHORT. */
  mode: string | null;
  map: string | null;
  players: number | null;
  maxPlayers: number | null;
  status: GameStatus | string | null;
  winner: Faction | 'NEUTRAL' | null;
}
