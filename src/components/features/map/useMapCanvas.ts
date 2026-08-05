"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { weightToColor } from "@/lib/colors";
import type { MapModel, Position } from "@/types/map";

export interface MapSettings {
  showHeatmap: boolean;
  showGrid: boolean;
}

interface CanvasSize {
  width: number;
  height: number;
}

const HEATMAP_GRADIENT = [
  { weight: 0, color: '#FFFFFF' },      // White
  { weight: 0.0001, color: '#00FF00' }, // Green
  { weight: 0.01, color: '#0000FF' },   // Blue
  { weight: 1, color: '#FF0000' },      // Red
];

/** Two clicks on the same tile within this window count as a double click. */
const DOUBLE_CLICK_MS = 500;

/** Keeps the canvas square and matched to its container. */
function useCanvasSize(mapDivRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const setCanvasDims = () => {
      const width = mapDivRef.current?.clientWidth || 0;
      const height = mapDivRef.current?.clientHeight || 0;
      const side = Math.min(width, height);
      setSize({ width: side, height: side });
    };

    setCanvasDims();
    window.addEventListener('resize', setCanvasDims);
    return () => window.removeEventListener('resize', setCanvasDims);
  }, [mapDivRef]);

  return size;
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
) {
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.reset();

    const tileWidth = size.width / map.dimensions.width;
    const tileHeight = size.height / map.dimensions.height;

    if (map.image && imageRef.current) {
      ctx.drawImage(
        imageRef.current,
        0, 0, map.image.width, map.image.height,
        0, 0, size.width, size.height,
      );
    }

    if (settings.showHeatmap) {
      ctx.globalAlpha = 0.6;
      for (let y = 0; y < map.dimensions.height; y++) {
        for (let x = 0; x < map.dimensions.width; x++) {
          const weight = map.tiles[x]?.[y]?.weight;
          if (!weight) continue;

          ctx.fillStyle = weightToColor(weight, HEATMAP_GRADIENT);
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
  }, [canvasRef, imageRef, map, settings, size, mapScale, hovered, selected]);
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

  const awaitingSecondClick = useRef(false);
  const lastClickPos = useRef<Position>({ x: -1, y: -1 });

  useCanvasPainter(canvasRef, mapImageRef, map, settings, canvasSize, mapScale, hovered, selected);

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
