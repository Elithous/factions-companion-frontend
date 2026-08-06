/**
 * Heatmap display model: what the overlay counts and how weights become colour.
 *
 * Lives outside the map component because the metric also decides which report
 * the stats page fetches — the map can't own that on its own.
 */

import { weightToColor } from '@/lib/colors';

/** Which activities the overlay counts. Mirrors the backend's `unitType`. */
export type HeatmapMetric = 'soldiers' | 'workers';

export const HEATMAP_METRICS: { value: HeatmapMetric; label: string }[] = [
  { value: 'soldiers', label: 'Soldiers' },
  { value: 'workers', label: 'Workers' },
];

export type GradientPresetName = 'classic' | 'heat' | 'viridis' | 'mono' | 'custom';

/**
 * Colour ramps, coldest first. Stops are spread evenly across the range — the
 * shape of the curve is the `intensity` control's job, not the palette's.
 */
export const GRADIENT_PRESETS: Record<Exclude<GradientPresetName, 'custom'>, string[]> = {
  classic: ['#FFFFFF', '#00FF00', '#0000FF', '#FF0000'],
  heat: ['#FFF7BC', '#FEC44F', '#F03B20', '#7F0000'],
  viridis: ['#440154', '#31688E', '#35B779', '#FDE725'],
  mono: ['#FFFFFF', '#8D6A3F', '#231B10'],
};

export const GRADIENT_PRESET_OPTIONS: { value: GradientPresetName; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'heat', label: 'Heat' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'mono', label: 'Monochrome' },
  { value: 'custom', label: 'Custom' },
];

export interface HeatmapGradient {
  preset: GradientPresetName;
  /** Used only when `preset` is 'custom'. Coldest first, 2-4 stops. */
  customColors: string[];
  /**
   * Low/high cutoff on the normalised 0-1 tile weight. Tiles under the low
   * cutoff aren't drawn at all, which is what makes it useful for hiding noise;
   * tiles over the high cutoff all read as the hottest colour.
   */
  range: [number, number];
  /**
   * Bends the ramp. Above 1 pushes low values up the scale, which the tile
   * distribution badly needs — a handful of contested tiles carry most of the
   * traffic, so a linear ramp leaves everything else invisible.
   */
  intensity: number;
}

export interface MapSettings {
  showHeatmap: boolean;
  showGrid: boolean;
  metric: HeatmapMetric;
  gradient: HeatmapGradient;
}

/**
 * The upper bound is deliberately generous. The old fixed gradient put its
 * colour changes at weights of 0.0001 and 0.01, which needs a curve well past
 * the usual 1-4 range to reproduce.
 */
export const INTENSITY_BOUNDS = { min: 1, max: 12, step: 0.1 };

/* -------------------------------------------------------------------------- */
/* Range slider scale                                                         */
/* -------------------------------------------------------------------------- */

/** Whole-number track positions; the gradient itself stores 0-1 weights. */
export const RANGE_SLIDER_STEPS = 100;

/**
 * Smallest non-zero cutoff the track can express — 0.01% of the busiest tile.
 *
 * Weights are normalised against the heaviest tile on the map, and the
 * distribution is brutally top-heavy: a few contested tiles carry most of the
 * traffic while everything else sits orders of magnitude below. On a linear
 * track every useful cutoff is crammed into the first tick or two, so the scale
 * is logarithmic and each decade gets an equal share of the travel.
 */
const RANGE_MIN_EXPONENT = -4;

/** Track position (0..RANGE_SLIDER_STEPS) to a 0-1 weight. */
export function sliderToWeight(position: number): number {
  // Position zero is special-cased to a true zero so "include everything"
  // stays reachable — a log scale can never actually arrive at it.
  if (position <= 0) return 0;
  if (position >= RANGE_SLIDER_STEPS) return 1;

  const fraction = position / RANGE_SLIDER_STEPS;
  return Math.pow(10, RANGE_MIN_EXPONENT * (1 - fraction));
}

/** The inverse of `sliderToWeight`, for driving the controlled slider. */
export function weightToSlider(weight: number): number {
  if (weight <= 0) return 0;
  if (weight >= 1) return RANGE_SLIDER_STEPS;

  const fraction = 1 - Math.log10(weight) / RANGE_MIN_EXPONENT;
  return Math.min(Math.max(Math.round(fraction * RANGE_SLIDER_STEPS), 0), RANGE_SLIDER_STEPS);
}

/**
 * Weight as a share of the busiest tile. Precision grows as the value shrinks,
 * since the bottom of a log scale is where the interesting cutoffs live and
 * "0%" for everything down there would be useless.
 */
export function formatWeightPercent(weight: number): string {
  if (weight <= 0) return '0%';

  const percent = weight * 100;
  if (percent >= 10) return `${Math.round(percent)}%`;
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  return `${percent.toFixed(2)}%`;
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  showHeatmap: true,
  showGrid: false,
  metric: 'soldiers',
  gradient: {
    preset: 'classic',
    customColors: ['#FFFFFF', '#00FF00', '#FF0000'],
    range: [0, 1],
    // Approximates the old hard-coded stops, which bunched every colour change
    // right down at the bottom of the range.
    intensity: 6,
  },
};

/** The active ramp, honouring the custom override. */
export function resolveGradientColors(gradient: HeatmapGradient): string[] {
  const colors = gradient.preset === 'custom'
    ? gradient.customColors.filter(Boolean)
    : GRADIENT_PRESETS[gradient.preset];

  // weightToColor interpolates between stops and needs at least two.
  return colors && colors.length >= 2 ? colors : GRADIENT_PRESETS.classic;
}

/** Spreads colours evenly across 0-1 for `weightToColor`. */
function toEvenStops(colors: string[]) {
  const lastIndex = colors.length - 1;
  return colors.map((color, index) => ({ weight: index / lastIndex, color }));
}

/**
 * Maps a normalised tile weight to a fill colour, or null when the tile falls
 * below the low cutoff and shouldn't be painted.
 */
export function heatmapColor(weight: number, gradient: HeatmapGradient): string | null {
  const [low, high] = gradient.range;
  if (weight <= 0 || weight < low) return null;

  const span = Math.max(high - low, 1e-6);
  const clamped = Math.min(Math.max((weight - low) / span, 0), 1);
  const eased = Math.pow(clamped, 1 / Math.max(gradient.intensity, 0.01));

  return weightToColor(eased, toEvenStops(resolveGradientColors(gradient)));
}
