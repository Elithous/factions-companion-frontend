/**
 * Typed wrappers for the backend's `report/*` endpoints.
 *
 * Pages and components call these instead of building endpoint strings
 * themselves, so a shape change only has to be fixed in one place.
 */

import type { ApiGameConfig } from '@/lib/game';
import type { ComboboxOption } from '@/components/ui/combobox';
import type { PlayerStats } from '@/types/player';
import type { TileTotals, ToFromFaction } from '@/types/stats';
import { fetchJson } from './client';

interface ActivePlayer {
  player_name: string;
}

/** IDs of every game the backend knows about. */
export async function getGames(): Promise<string[]> {
  const ids = await fetchJson<Array<number | string>>('report/games');
  return ids.map(String);
}

/** `[startSeconds, endSeconds]` bounds of a game, converted to milliseconds. */
export async function getGameTimespan(gameId: string): Promise<[number, number]> {
  const [start, end] = await fetchJson<[number, number]>('report/games/timespan', { gameId });
  return [start * 1000, end * 1000];
}

export function getGameConfig(gameId: string) {
  return fetchJson<ApiGameConfig>('report/games/config', { gameId });
}

/** Players who took an action in a game, as ready-to-use combobox options. */
export async function getActivePlayerOptions(gameId: string): Promise<ComboboxOption[]> {
  const players = await fetchJson<ActivePlayer[]>('report/player/active', { gameId });

  return players
    .map(player => ({ value: player.player_name, label: player.player_name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getPlayerStats(gameId: string, playerName: string) {
  return fetchJson<PlayerStats>(`report/player/stats/${playerName}`, { gameId });
}

export function getSoldiersByFaction(params: Record<string, string | number | undefined>) {
  return fetchJson<ToFromFaction>('report/soldiers/faction', params);
}

export function getSoldiersByTile(params: Record<string, string | number | undefined>) {
  return fetchJson<TileTotals>('report/soldiers/tile', params);
}
