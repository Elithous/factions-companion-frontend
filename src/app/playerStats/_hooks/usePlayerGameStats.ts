"use client";

import { useMemo } from "react";

import { useFilteredStats, useGameOverview } from "@/app/stats/_hooks/useGameStats";
import type { StatsFilter } from "@/types/stats";

/**
 * Game-wide totals plus one player's filtered soldier/tile stats for the
 * selected game. Reuses the stats page's data hooks (`useGameOverview`,
 * `useFilteredStats`) scoped to a single-player filter, and only fetches
 * once both a game and a player are selected.
 */
export function usePlayerGameStats(
  gameId: string,
  playerId: number | null,
  playerName?: string | null,
) {
  const activeGameId = playerId !== null ? gameId : '';
  // `playerId` is what narrows the query; the name rides along for the filter
  // badge only.
  const filter = useMemo<StatsFilter>(
    () => ({ playerId: playerId ?? undefined, playerName: playerName ?? undefined }),
    [playerId, playerName],
  );

  const overview = useGameOverview(activeGameId);
  const filtered = useFilteredStats(activeGameId, filter);

  return {
    filter,
    overview,
    filtered,
    error: overview.error ?? filtered.error,
    isLoading: overview.isLoading || filtered.isLoading,
  };
}
