"use client";

import { useEffect, useState } from 'react';

import { getBuildingCatalogue } from '@/lib/api/reports';
import { EMPTY_CATALOGUE, type BuildingCatalogue } from '@/lib/game';

/**
 * The building catalogue for a game, or the newest game's when none is given.
 *
 * Callers get `EMPTY_CATALOGUE` while it loads rather than undefined, so cost
 * and effect maths can run unconditionally and simply produce zeroes until the
 * real numbers arrive.
 */
export function useBuildingCatalogue(gameId?: string) {
  const [catalogue, setCatalogue] = useState<BuildingCatalogue>(EMPTY_CATALOGUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getBuildingCatalogue(gameId || undefined)
      .then(result => {
        if (cancelled) return;
        setCatalogue(result);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setCatalogue(EMPTY_CATALOGUE);
        setError('Failed to load building data.');
        console.error('Error fetching building catalogue:', err);
      })
      .finally(() => !cancelled && setIsLoading(false));

    return () => { cancelled = true; };
  }, [gameId]);

  return { catalogue, isLoading, error };
}
