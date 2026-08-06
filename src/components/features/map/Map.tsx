"use client";

import Image from 'next/image';
import { useState } from "react";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DEFAULT_MAP_SETTINGS, type MapSettings } from "@/lib/heatmap";
import type { MapModel, Position } from "@/types/map";

import MapSettingsPopover from "./MapSettingsPopover";
import { useMapCanvas } from "./useMapCanvas";
import { PANZOOM_EXCLUDE_CLASS, usePanzoom } from "./usePanzoom";
import "./map.scss";

const INNER_MAP_ID = 'inner-map';

export interface MapProps {
  map: MapModel;
  /** How many ancestors up to attach the zoom-on-wheel handler. */
  wheelParentDepth?: number;
  mapScale?: number;
  /** Currently selected tile, if any. */
  tile?: Position;
  coordClicked: (x: number, y: number) => void;
  className?: string;
  /**
   * Controlled settings. Omit both to let the map keep its own — only a parent
   * that can refetch for a different metric should take ownership.
   */
  settings?: MapSettings;
  onSettingsChange?: (settings: MapSettings) => void;
}

/** Pannable, zoomable game map with an optional density heatmap. */
export default function Map({
  map,
  coordClicked,
  tile,
  wheelParentDepth = 0,
  mapScale = 1,
  className = '',
  settings: controlledSettings,
  onSettingsChange,
}: MapProps) {
  const [ownSettings, setOwnSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [showInstructions, setShowInstructions] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const settings = controlledSettings ?? ownSettings;
  const setSettings = onSettingsChange ?? setOwnSettings;

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

        {/* Excluded from panzoom, or pressing the gear starts a pan and the click
            never arrives. See PANZOOM_EXCLUDE_CLASS. */}
        <div className={`map-settings ${PANZOOM_EXCLUDE_CLASS}`}>
          <MapSettingsPopover
            settings={settings}
            setSettings={setSettings}
            showMetricSwitch={!!onSettingsChange}
            onResetView={() => panzoomRef.current?.zoom(1 / mapScale, { animate: true })}
          />
        </div>

        {showInstructions && (
          <p
            className={`map-instructions ${PANZOOM_EXCLUDE_CLASS} cursor-pointer text-sm text-muted-foreground`}
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
