"use client";

import { useEffect, useRef } from "react";
import Panzoom, { PanzoomObject } from "@panzoom/panzoom";

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
