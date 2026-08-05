"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Makes a horizontally-scrolling element draggable, and converts vertical
 * wheel input into horizontal scrolling so the page doesn't move underneath it.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, scrollLeft: ref.current.scrollLeft };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const element = ref.current;
      if (!element) return;

      const next = dragStart.current.scrollLeft + (dragStart.current.x - e.clientX);
      element.scrollLeft = Math.max(0, Math.min(next, element.scrollWidth - element.clientWidth));
    };
    const onMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.scrollLeft += e.deltaY;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  /** Scroll so that `offset` (in px from the left) sits in the middle. */
  const centerOn = useCallback((offset: number, itemWidth: number) => {
    const element = ref.current;
    if (!element) return;

    const target = offset - element.clientWidth / 2 + itemWidth / 2;
    element.scrollTo({
      left: Math.max(0, Math.min(target, element.scrollWidth - element.clientWidth)),
      behavior: 'smooth',
    });
  }, []);

  return { ref, isDragging, onMouseDown, centerOn };
}
