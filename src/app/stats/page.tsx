"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import GameSelect from '@/components/features/game/GameSelect';
import Map from '@/components/features/map/Map';
import StatsFilters from '@/components/features/stats/StatsFilters';
import StatsPanel from '@/components/features/stats/StatsPanel';
import TileDetailPanel from '@/components/features/stats/TileDetailPanel';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_MAP_SETTINGS, type MapSettings } from '@/lib/heatmap';
import type { MapModel } from '@/types/map';
import type { StatsFilter } from '@/types/stats';

import {
  StatsError,
  useFilteredStats,
  useGameOverview,
  useTileDetail,
} from './_hooks/useGameStats';
import './stats.scss';

/**
 * Stable reference so StatsFilters doesn't re-sync its internal state on every
 * render while the real range is still loading.
 */
const EMPTY_DATE_RANGE: [number, number] = [0, 0];

const DEFAULT_MAP_SIZE = 50;

function ErrorCard({ error }: { error: StatsError }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Card className="error-container border-destructive/50 bg-destructive/10 p-4">
        <p className="mb-2 text-lg font-medium">Error</p>
        <p>{error.message}</p>
        {error.details && <p className="mt-2 text-sm text-muted-foreground">{error.details}</p>}
      </Card>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const path = usePathname();
  const queryParams = useSearchParams();

  const [gameId, setGameId] = useState(queryParams.get('gameId') || '');
  const [filter, setFilter] = useState<StatsFilter>({});
  // Owned here rather than inside Map: the metric decides which report the tile
  // heat comes from, so the fetch has to see it.
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);

  const overview = useGameOverview(gameId);
  const filtered = useFilteredStats(gameId, filter, mapSettings.metric);
  const tileDetail = useTileDetail(gameId, filter);
  // A failed tile drill-down shouldn't blank the whole page — it surfaces in the
  // panel instead, so it's deliberately left out of this.
  const error = overview.error ?? filtered.error;

  const updateFilter = useCallback((rule: StatsFilter) => {
    setFilter(prev => ({ ...prev, ...rule }));
  }, []);

  // Keep the selected game in the URL, and clear filters when it changes.
  useEffect(() => {
    if (!gameId) return;
    setFilter({});
    router.replace(`${path}?gameId=${gameId}`);
  }, [gameId, path, router]);

  const onTileClicked = useCallback((x: number, y: number) => {
    const isSameTile = filter.tile?.x === x && filter.tile?.y === y;
    updateFilter({ tile: isSameTile ? undefined : { x, y } });
  }, [filter.tile, updateFilter]);

  if (error) return <ErrorCard error={error} />;

  const mapModel: MapModel = {
    dimensions: {
      width: overview.mapConfig?.width || DEFAULT_MAP_SIZE,
      height: overview.mapConfig?.height || DEFAULT_MAP_SIZE,
    },
    image: overview.mapImage,
    tiles: filtered.mapTiles,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-8">
        <GameSelect gameId={gameId} setGameId={setGameId} />

        {gameId ? (
          <div className='map-stats'>
            <div className='map-wrapper'>
              <Map
                map={mapModel}
                wheelParentDepth={2}
                mapScale={4}
                tile={filter.tile}
                coordClicked={onTileClicked}
                settings={mapSettings}
                onSettingsChange={setMapSettings}
              />
            </div>

            <StatsFilters
              gameId={gameId}
              filter={filter}
              updateFilter={updateFilter}
              dateRange={overview.dateRange || EMPTY_DATE_RANGE}
            />

            <TileDetailPanel
              detail={tileDetail.detail}
              isLoading={tileDetail.isLoading}
              error={tileDetail.error?.message ?? null}
            />

            <StatsPanel
              filter={filter}
              data={{ total: overview.totalData, filtered: filtered.filteredData }}
            />

            {filtered.isLoading && (
              <div className="loading-overlay">
                <Spinner size={48} />
              </div>
            )}
          </div>
        ) : (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">Select a game to view statistics</p>
          </Card>
        )}
      </div>
    </div>
  );
}
