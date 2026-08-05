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
export function usePlayerGameStats(gameId: string, playerName: string | null) {
  const activeGameId = playerName ? gameId : '';
  const filter = useMemo<StatsFilter>(() => ({ playerName: playerName || undefined }), [playerName]);

  const overview = useGameOverview(activeGameId);
  const filtered = useFilteredStats(activeGameId, filter);

  return {
    filter,
    overview,
    filtered,
    error: overview.error ?? filtered.error,
  };
}
