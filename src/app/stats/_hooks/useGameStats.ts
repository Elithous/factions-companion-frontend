"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getGameConfig,
  getGameTimespan,
  getSoldiersByFaction,
  getSoldiersByTile,
  getTileDetail,
} from "@/lib/api/reports";
import { toBuildingCategoryMap, type BuildingCategoryMap } from "@/lib/game/buildingAssets";
import type { HeatmapMetric } from "@/lib/heatmap";
import { getMapImage } from "@/lib/maps";
import type { MapConfig, MapTilesListModel } from "@/types/map";
import type { StatsFilter, TileDetail, ToFromFaction } from "@/types/stats";
import type { StaticImageData } from "next/image";

export interface StatsError {
  message: string;
  details?: string;
}

/** Translate the UI filter into the query params the report endpoints expect. */
function toQueryParams(gameId: string, filter: StatsFilter) {
  return {
    gameId,
    unitType: filter.type,
    tileX: filter.tile?.x?.toString(),
    tileY: filter.tile?.y?.toString(),
    playerId: filter.playerId,
    fromFaction: filter.fromFaction,
    toFaction: filter.toFaction,
    dateStart: filter.dateRange ? (filter.dateRange[0] / 1000).toString() : undefined,
    dateEnd: filter.dateRange ? (filter.dateRange[1] / 1000).toString() : undefined,
  };
}

const toError = (message: string, err: unknown): StatsError => ({
  message,
  details: err instanceof Error ? err.message : 'Unknown error',
});

/**
 * Game-wide data that only reloads when the selected game changes: total
 * soldier flows, the available date range, and the map.
 */
export function useGameOverview(gameId: string) {
  const [totalData, setTotalData] = useState<ToFromFaction>({});
  const [dateRange, setDateRange] = useState<[number, number]>();
  const [mapConfig, setMapConfig] = useState<MapConfig>();
  const [mapImage, setMapImage] = useState<StaticImageData>();
  // Each game carries its own building catalogue; the bundled table is stale.
  const [buildingCategories, setBuildingCategories] = useState<BuildingCategoryMap>();
  const [error, setError] = useState<StatsError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!gameId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setIsLoading(true);
    setTotalData({});
    setDateRange(undefined);

    Promise.all([
      getSoldiersByFaction({ gameId }),
      getGameTimespan(gameId),
      getGameConfig(gameId),
    ])
      .then(([soldiers, timespan, config]) => {
        if (cancelled) return;
        setTotalData(soldiers);
        setDateRange(timespan);

        const map = (config as { mapConfig?: MapConfig }).mapConfig;
        setMapConfig(map);
        setMapImage(getMapImage(map?.name));
        setBuildingCategories(toBuildingCategoryMap(config?.buildings));
      })
      .catch(err => !cancelled && setError(toError('Failed to load game data', err)))
      .finally(() => !cancelled && setIsLoading(false));

    return () => { cancelled = true; };
  }, [gameId]);

  return { totalData, dateRange, mapConfig, mapImage, buildingCategories, error, isLoading };
}

/**
 * Soldier flows and tile heat for the currently applied filter.
 *
 * `metric` only reaches the by-tile report: the faction table is a soldier
 * flow between factions and has no worker equivalent, so it stays as-is when
 * the heatmap switches to workers.
 */
export function useFilteredStats(
  gameId: string,
  filter: StatsFilter,
  metric: HeatmapMetric = 'soldiers',
) {
  const [filteredData, setFilteredData] = useState<ToFromFaction>({});
  const [mapTiles, setMapTiles] = useState<MapTilesListModel>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StatsError | null>(null);

  const load = useCallback(async () => {
    const params = toQueryParams(gameId, filter);
    setIsLoading(true);
    setError(null);

    try {
      const [soldiers, tiles] = await Promise.all([
        getSoldiersByFaction(params),
        getSoldiersByTile({ ...params, unitType: metric }),
      ]);

      setFilteredData(soldiers);

      // Normalise tile totals to 0-1 so the heatmap gradient can use them.
      const maxValue = Object.values(tiles).reduce(
        (max, column) => Math.max(max, ...Object.values(column)),
        0,
      );

      const nextTiles: MapTilesListModel = {};
      for (const [xKey, column] of Object.entries(tiles)) {
        const x = parseInt(xKey);
        nextTiles[x] = {};
        for (const [yKey, value] of Object.entries(column)) {
          nextTiles[x][parseInt(yKey)] = { weight: maxValue ? value / maxValue : 0 };
        }
      }
      setMapTiles(nextTiles);
    } catch (err) {
      setError(toError('Failed to load filtered data', err));
    } finally {
      setIsLoading(false);
    }
  }, [gameId, filter, metric]);

  useEffect(() => {
    if (!gameId) return;
    load();
  }, [gameId, load]);

  return { filteredData, mapTiles, isLoading, error };
}

/**
 * The full breakdown for the currently selected tile.
 *
 * Returns `null` data when no tile is selected, so the panel can simply not
 * render rather than every caller having to guard on `filter.tile`.
 */
export function useTileDetail(gameId: string, filter: StatsFilter) {
  const [detail, setDetail] = useState<TileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StatsError | null>(null);

  const tile = filter.tile;

  useEffect(() => {
    if (!gameId || !tile) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getTileDetail(toQueryParams(gameId, filter))
      .then(data => !cancelled && setDetail(data))
      .catch(err => {
        if (cancelled) return;
        setDetail(null);
        setError(toError('Failed to load tile details', err));
      })
      .finally(() => !cancelled && setIsLoading(false));

    return () => { cancelled = true; };
  }, [gameId, filter]);

  return { detail, isLoading, error };
}
