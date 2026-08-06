"use client";

import { useEffect, useRef } from "react";
import Panzoom, { PanzoomObject } from "@panzoom/panzoom";

/**
 * Marks UI that sits on top of the map as off-limits to panning.
 *
 * In canvas mode panzoom listens for pointerdown on the map's *parent*, and its
 * default start handler calls both `preventDefault()` and `stopPropagation()`.
 * That happens on a native listener partway up the tree, so it runs before React
 * delegated handlers at the root — a control inside the map can't defend itself
 * by stopping propagation, and never receives a click at all, because
 * preventDefault on pointerdown suppresses the compatibility mouse events.
 *
 * Panzoom checks this class on the event target and every ancestor, so anything
 * carrying it is skipped before that start handler runs.
 */
export const PANZOOM_EXCLUDE_CLASS = 'panzoom-exclude';

/**
 * Initialises panzoom on the inner map element and wires the wheel handler to
 * an ancestor `wheelParentDepth` levels up, so scrolling anywhere over the map
 * container zooms rather than scrolling the page.
 */
export function usePanzoom(
  elementId: string,
  wheelParentDepth: number,
  mapScale: number,
) {
  const panzoomRef = useRef<PanzoomObject | null>(null);

  useEffect(() => {
    const innerMap = document.getElementById(elementId);
    if (!innerMap) return;

    const panzoomObj = Panzoom(innerMap, {
      maxScale: 8 / mapScale,
      contain: 'outside',
      canvas: true,
      roundPixels: false,
      // Matches panzoom's own default, but stated explicitly so the link between
      // the class on the overlay controls and this behaviour is findable.
      excludeClass: PANZOOM_EXCLUDE_CLASS,
    });

    // Set initial zoom on the next tick, once layout has settled.
    const zoomTimer = setTimeout(() => panzoomObj.zoom(1 / mapScale));

    let wheelEventTarget = innerMap;
    for (let i = 0; i < wheelParentDepth; i++) {
      const parent = wheelEventTarget.parentElement;
      if (parent) wheelEventTarget = parent;
    }
    wheelEventTarget.addEventListener('wheel', panzoomObj.zoomWithWheel);

    panzoomRef.current = panzoomObj;

    return () => {
      clearTimeout(zoomTimer);
      wheelEventTarget.removeEventListener('wheel', panzoomObj.zoomWithWheel);
      panzoomObj.destroy();
    };
  }, [elementId, wheelParentDepth, mapScale]);

  return panzoomRef;
}
