"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

import GameSelect from '@/components/features/game/GameSelect';
import Map from '@/components/features/map/Map';
import StatsFilters from '@/components/features/stats/StatsFilters';
import StatsPanel from '@/components/features/stats/StatsPanel';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { MapModel } from '@/types/map';
import type { StatsFilter } from '@/types/stats';

import { StatsError, useFilteredStats, useGameOverview } from './_hooks/useGameStats';
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
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle size={20} className="text-destructive" />
          <p className="text-lg font-medium">Error</p>
        </div>
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

  const overview = useGameOverview(gameId);
  const filtered = useFilteredStats(gameId, filter);
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
              />
            </div>

            <StatsFilters
              gameId={gameId}
              filter={filter}
              updateFilter={updateFilter}
              dateRange={overview.dateRange || EMPTY_DATE_RANGE}
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
