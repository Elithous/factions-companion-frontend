import type { StaticImageData } from "next/image";

import Map from "@/components/features/map/Map";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { MapConfig, MapTilesListModel } from "@/types/map";

const DEFAULT_MAP_SIZE = 50;

interface PlayerHeatmapProps {
  hasPlayer: boolean;
  isLoading: boolean;
  mapConfig?: MapConfig;
  mapImage?: StaticImageData;
  mapTiles: MapTilesListModel;
}

/** Read-only map showing where the selected player's soldiers were active. */
export default function PlayerHeatmap({ hasPlayer, isLoading, mapConfig, mapImage, mapTiles }: PlayerHeatmapProps) {
  if (!hasPlayer) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Select a player to view their map heatmap.</p>
      </Card>
    );
  }

  return (
    <div className="relative h-[60vh] w-full overflow-hidden rounded-lg bg-[var(--orange-900)] shadow md:h-[70vh]">
      <Map
        map={{
          dimensions: { width: mapConfig?.width || DEFAULT_MAP_SIZE, height: mapConfig?.height || DEFAULT_MAP_SIZE },
          image: mapImage,
          tiles: mapTiles,
        }}
        wheelParentDepth={2}
        mapScale={4}
        coordClicked={() => {}}
      />
      {isLoading && (
        <div className="loading-overlay">
          <Spinner size={32} />
        </div>
      )}
    </div>
  );
}
