/**
 * Typed wrappers for the backend's `report/*` endpoints.
 *
 * Pages and components call these instead of building endpoint strings
 * themselves, so a shape change only has to be fixed in one place.
 */

import type { ApiGameConfig, BuildingCatalogue } from '@/lib/game';
import type { ComboboxOption } from '@/components/ui/combobox';
import type { GameSummary } from '@/types/game';
import type { PlayerIdentity, PlayerProfile, PlayerStats } from '@/types/player';
import type { TileDetail, TileTotals, ToFromFaction } from '@/types/stats';
import { fetchJson } from './client';

interface ActivePlayer {
  player_id: number;
  player_name: string;
}

/**
 * Every game the backend holds activity for, with what it knows about each.
 * Pass `playerId` to narrow it to the games that player took part in.
 */
export async function getGames(playerId?: number): Promise<GameSummary[]> {
  const games = await fetchJson<GameSummary[]>('report/games', { playerId });
  return games.map(game => ({ ...game, id: String(game.id) }));
}

/** Every player across every game, keyed on the stable player id. */
export function getAllPlayers(): Promise<PlayerIdentity[]> {
  return fetchJson<PlayerIdentity[]>('report/player/all');
}

/** `[startSeconds, endSeconds]` bounds of a game, converted to milliseconds. */
export async function getGameTimespan(gameId: string): Promise<[number, number]> {
  const [start, end] = await fetchJson<[number, number]>('report/games/timespan', { gameId });
  return [start * 1000, end * 1000];
}

export function getGameConfig(gameId: string) {
  return fetchJson<ApiGameConfig>('report/games/config', { gameId });
}

/**
 * The building catalogue for a game. Omit `gameId` and the backend serves the
 * newest game's, which is what the calculator uses before one is picked.
 */
export function getBuildingCatalogue(gameId?: string) {
  return fetchJson<BuildingCatalogue>('report/games/buildings', { gameId });
}

/**
 * Players who took an action in a game, as combobox options.
 *
 * The option value is the player id as a string — comboboxes deal in strings,
 * and callers parse it back when handing it to the API.
 */
export async function getActivePlayerOptions(gameId: string): Promise<ComboboxOption[]> {
  const players = await fetchJson<ActivePlayer[]>('report/player/active', { gameId });

  return players
    .map(player => ({
      value: String(player.player_id),
      label: player.player_name,
      searchText: player.player_name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** A player's career profile. `refresh` rebuilds it instead of serving the cache. */
export function getPlayerProfile(playerId: number, refresh = false) {
  return fetchJson<PlayerProfile>(
    `report/player/profile/${playerId}`,
    refresh ? { refresh: 'true' } : undefined,
  );
}

export function getPlayerStats(gameId: string, playerId: number) {
  return fetchJson<PlayerStats>(`report/player/stats/${playerId}`, { gameId });
}

export function getSoldiersByFaction(params: Record<string, string | number | undefined>) {
  return fetchJson<ToFromFaction>('report/soldiers/faction', params);
}

export function getSoldiersByTile(params: Record<string, string | number | undefined>) {
  return fetchJson<TileTotals>('report/units/tile', params);
}

/**
 * Full drill-down for a single tile. `params` must carry `tileX` and `tileY`;
 * the remaining filter params are optional and narrow the same way the rest of
 * the stats page does.
 */
export function getTileDetail(params: Record<string, string | number | undefined>) {
  return fetchJson<TileDetail>('report/tile/detail', params);
}
