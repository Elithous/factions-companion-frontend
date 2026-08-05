"use client";

import Image from 'next/image';
import { useState } from "react";
import { Settings } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { MapModel, Position } from "@/types/map";

import { MapSettings, useMapCanvas } from "./useMapCanvas";
import { usePanzoom } from "./usePanzoom";
import "./map.scss";

const INNER_MAP_ID = 'inner-map';

const DEFAULT_SETTINGS: MapSettings = {
  showHeatmap: true,
  showGrid: false,
};

export interface MapProps {
  map: MapModel;
  /** How many ancestors up to attach the zoom-on-wheel handler. */
  wheelParentDepth?: number;
  mapScale?: number;
  /** Currently selected tile, if any. */
  tile?: Position;
  coordClicked: (x: number, y: number) => void;
  className?: string;
}

function MapSettingsPopover({
  settings,
  setSettings,
  onResetView,
}: {
  settings: MapSettings;
  setSettings: (settings: MapSettings) => void;
  onResetView: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <SimpleTooltip label="Map Settings">
          <button
            type="button"
            aria-label="Map settings"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-popover/80 text-foreground shadow hover:bg-popover"
          >
            <Settings size={18} />
          </button>
        </SimpleTooltip>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-heatmap"
              checked={settings.showHeatmap}
              onCheckedChange={checked => setSettings({ ...settings, showHeatmap: checked === true })}
            />
            <Label htmlFor="show-heatmap">Show Heatmap</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-grid"
              checked={settings.showGrid}
              onCheckedChange={checked => setSettings({ ...settings, showGrid: checked === true })}
            />
            <Label htmlFor="show-grid">Show Grid</Label>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onResetView}
              className="reset-button text-sm underline underline-offset-2 hover:no-underline"
            >
              Reset View
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Pannable, zoomable game map with an optional soldier-density heatmap. */
export default function Map({
  map,
  coordClicked,
  tile,
  wheelParentDepth = 0,
  mapScale = 1,
  className = '',
}: MapProps) {
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [showInstructions, setShowInstructions] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const panzoomRef = usePanzoom(INNER_MAP_ID, wheelParentDepth, mapScale);
  const { canvasRef, mapDivRef, mapImageRef, handleTileClick, canvasSize } =
    useMapCanvas(map, settings, mapScale, tile, coordClicked);

  return (
    <div className={`map-parent ${className}`}>
      <div className="map-container">
        <div
          id={INNER_MAP_ID}
          className="map"
          ref={mapDivRef}
          style={{
            width: `${100 * mapScale}%`,
            height: `${100 * mapScale}%`,
            backgroundColor: 'rgba(0, 0, 0, .4)',
          }}
        >
          {map.image && (
            <Image
              ref={mapImageRef}
              src={map.image}
              priority
              alt="Map background"
              style={{ display: 'none' }}
            />
          )}

          <canvas
            ref={canvasRef}
            id="map-canvas"
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={handleTileClick}
            aria-label="Interactive game map"
          />
        </div>

        <div className="map-settings">
          <MapSettingsPopover
            settings={settings}
            setSettings={setSettings}
            onResetView={() => panzoomRef.current?.zoom(1 / mapScale, { animate: true })}
          />
        </div>

        {showInstructions && (
          <p
            className="map-instructions cursor-pointer text-sm text-muted-foreground"
            onClick={() => setShowInstructions(false)}
          >
            {isMobile
              ? 'Pinch to zoom. Double tap to select tile'
              : 'Scroll to zoom. Double click to select tile'}
          </p>
        )}
      </div>
    </div>
  );
}
