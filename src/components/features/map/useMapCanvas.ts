"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { heatmapColor, type MapSettings } from "@/lib/heatmap";
import type { MapModel, Position } from "@/types/map";

export type { MapSettings };

interface CanvasSize {
  width: number;
  height: number;
}

/** Two clicks on the same tile within this window count as a double click. */
const DOUBLE_CLICK_MS = 500;

/**
 * Keeps the canvas square and matched to its container.
 *
 * Observes the container rather than listening for window resizes: the map box
 * changes size for reasons the window never hears about — the panel below it
 * expanding, a font landing, the flex row rewrapping — and measuring only once
 * at mount can catch it before layout has settled, leaving a zero-sized canvas
 * until something else happens to force a remeasure.
 */
function useCanvasSize(mapDivRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = mapDivRef.current;
    if (!element) return;

    const setCanvasDims = () => {
      const side = Math.min(element.clientWidth || 0, element.clientHeight || 0);
      // Skip no-op updates; the observer fires more often than the size changes.
      setSize(prev => (prev.width === side && prev.height === side ? prev : { width: side, height: side }));
    };

    setCanvasDims();

    const observer = new ResizeObserver(setCanvasDims);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mapDivRef]);

  return size;
}

/**
 * Tracks whether the background image has actually decoded.
 *
 * The painter runs in an effect that has no idea the `<img>` is still in flight,
 * and `drawImage` with an incomplete image silently draws nothing. Without this
 * the map comes up blank and stays that way until some unrelated change — a
 * filter, a hover, a resize — happens to trigger a repaint, which is why it
 * looked like it needed a refresh.
 */
function useImageReady(
  imageRef: React.RefObject<HTMLImageElement | null>,
  image: MapModel['image'],
) {
  const [readySrc, setReadySrc] = useState<string | null>(null);

  useEffect(() => {
    const element = imageRef.current;
    if (!image || !element) {
      setReadySrc(null);
      return;
    }

    const markReady = () => setReadySrc(element.currentSrc || element.src);

    // A cached image is already complete before this effect runs and will never
    // fire another load event, so check up front. On a game switch `complete`
    // can still describe the *previous* image, so the listener stays attached
    // either way rather than early-returning on a stale true — worst case the
    // old map paints for one frame before the new one lands.
    if (element.complete && element.naturalWidth > 0) {
      markReady();
    } else {
      setReadySrc(null);
    }

    element.addEventListener('load', markReady);
    return () => element.removeEventListener('load', markReady);
  }, [imageRef, image]);

  return readySrc;
}

/** Tracks which tile the pointer is over, in map coordinates. */
function useHoveredTile(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  dimensions: MapModel['dimensions'],
) {
  const [hovered, setHovered] = useState<Position | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateHover = (e: MouseEvent | TouchEvent) => {
      const point = e instanceof MouseEvent ? e : e.touches[0];
      if (!point) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;

      // Position within the canvas, then snapped to the nearest grid cell.
      const x = (point.clientX - rect.left) / scaleX;
      const y = (point.clientY - rect.top) / scaleY;

      setHovered({
        x: Math.floor(x / (canvas.width / dimensions.width)),
        y: Math.floor(y / (canvas.height / dimensions.height)),
      });
    };

    const clearHover = () => setHovered(null);

    canvas.addEventListener('mousemove', updateHover);
    canvas.addEventListener('touchstart', updateHover);
    canvas.addEventListener('mouseleave', clearHover);

    return () => {
      canvas.removeEventListener('mousemove', updateHover);
      canvas.removeEventListener('touchstart', updateHover);
      canvas.removeEventListener('mouseleave', clearHover);
    };
  }, [canvasRef, dimensions.width, dimensions.height]);

  return hovered;
}

/** Redraws the map: background image, heatmap, grid, hover and selection. */
function useCanvasPainter(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  imageRef: React.RefObject<HTMLImageElement | null>,
  map: MapModel,
  settings: MapSettings,
  size: CanvasSize,
  mapScale: number,
  hovered: Position | null,
  selected?: Position,
  /** Changes once the background image is decoded, forcing a repaint. */
  readySrc?: string | null,
) {
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.reset();

    const tileWidth = size.width / map.dimensions.width;
    const tileHeight = size.height / map.dimensions.height;

    const image = imageRef.current;
    if (image && readySrc && image.naturalWidth > 0) {
      // Source rect comes from the decoded bitmap, not the imported asset's
      // intrinsic size — Next may serve a rescaled file, and a mismatched source
      // rect would crop or letterbox the map.
      ctx.drawImage(
        image,
        0, 0, image.naturalWidth, image.naturalHeight,
        0, 0, size.width, size.height,
      );
    }

    if (settings.showHeatmap) {
      ctx.globalAlpha = 0.6;
      for (let y = 0; y < map.dimensions.height; y++) {
        for (let x = 0; x < map.dimensions.width; x++) {
          const weight = map.tiles[x]?.[y]?.weight;
          if (!weight) continue;

          // Null means the tile fell below the low cutoff — leave it unpainted
          // so the map shows through.
          const color = heatmapColor(weight, settings.gradient);
          if (!color) continue;

          ctx.fillStyle = color;
          ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
        }
      }
    }

    if (settings.showGrid) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5 * mapScale;

      for (let x = 0; x <= map.dimensions.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileWidth, 0);
        ctx.lineTo(x * tileWidth, size.height);
        ctx.stroke();
      }
      for (let y = 0; y <= map.dimensions.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileHeight);
        ctx.lineTo(size.width, y * tileHeight);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = mapScale;
    ctx.strokeStyle = '#000';

    if (hovered) {
      ctx.setLineDash([2 * mapScale, 1 * mapScale]);
      ctx.strokeRect(hovered.x * tileWidth, hovered.y * tileHeight, tileWidth, tileHeight);
    }

    if (selected) {
      ctx.setLineDash([]);
      ctx.strokeRect(selected.x * tileWidth, selected.y * tileHeight, tileWidth, tileHeight);
    }
  }, [canvasRef, imageRef, map, settings, size, mapScale, hovered, selected, readySrc]);
}

/**
 * Owns the map canvas: sizing, pointer tracking, painting and tile selection.
 * A tile is selected on double click, so single clicks stay free for panning.
 */
export function useMapCanvas(
  map: MapModel,
  settings: MapSettings,
  mapScale: number,
  selected?: Position,
  onTileClick?: (x: number, y: number) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

  const canvasSize = useCanvasSize(mapDivRef);
  const hovered = useHoveredTile(canvasRef, map.dimensions);
  const readySrc = useImageReady(mapImageRef, map.image);

  const awaitingSecondClick = useRef(false);
  const lastClickPos = useRef<Position>({ x: -1, y: -1 });

  useCanvasPainter(
    canvasRef, mapImageRef, map, settings, canvasSize, mapScale, hovered, selected, readySrc,
  );

  const handleTileClick = useCallback(() => {
    if (!hovered || !onTileClick) return;

    const isSecondClickOnSameTile =
      awaitingSecondClick.current &&
      lastClickPos.current.x === hovered.x &&
      lastClickPos.current.y === hovered.y;

    if (isSecondClickOnSameTile) {
      onTileClick(hovered.x, hovered.y);
      return;
    }

    lastClickPos.current = { x: hovered.x, y: hovered.y };
    awaitingSecondClick.current = true;
    setTimeout(() => { awaitingSecondClick.current = false; }, DOUBLE_CLICK_MS);
  }, [hovered, onTileClick]);

  return { canvasRef, mapDivRef, mapImageRef, handleTileClick, canvasSize };
}
