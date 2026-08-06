"use client";

import { Settings } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  formatWeightPercent,
  GRADIENT_PRESET_OPTIONS,
  HEATMAP_METRICS,
  INTENSITY_BOUNDS,
  RANGE_SLIDER_STEPS,
  resolveGradientColors,
  sliderToWeight,
  weightToSlider,
  type HeatmapGradient,
  type MapSettings,
} from "@/lib/heatmap";

export interface MapSettingsPopoverProps {
  settings: MapSettings;
  setSettings: (settings: MapSettings) => void;
  onResetView: () => void;
  /** Hidden when the parent can't refetch data for a different metric. */
  showMetricSwitch?: boolean;
}

/** Live preview of the active ramp, so the sliders have something to react to. */
function GradientPreview({ gradient }: { gradient: HeatmapGradient }) {
  const colors = resolveGradientColors(gradient);
  const [low, high] = gradient.range;

  return (
    <div className="gradient-preview">
      <div
        className="gradient-preview-bar"
        style={{ backgroundImage: `linear-gradient(to right, ${colors.join(', ')})` }}
      />
      <div className="gradient-preview-scale">
        <span>{formatWeightPercent(low)}</span>
        <span>{formatWeightPercent(high)}</span>
      </div>
    </div>
  );
}

function CustomColorInputs({
  gradient,
  onChange,
}: {
  gradient: HeatmapGradient;
  onChange: (gradient: HeatmapGradient) => void;
}) {
  const setColorAt = (index: number, color: string) => {
    const customColors = [...gradient.customColors];
    customColors[index] = color;
    onChange({ ...gradient, customColors });
  };

  return (
    <div className="custom-colors">
      {gradient.customColors.map((color, index) => (
        <input
          key={index}
          type="color"
          value={color}
          aria-label={`Gradient colour ${index + 1}`}
          onChange={event => setColorAt(index, event.target.value)}
        />
      ))}
    </div>
  );
}

export default function MapSettingsPopover({
  settings,
  setSettings,
  onResetView,
  showMetricSwitch = false,
}: MapSettingsPopoverProps) {
  const { gradient } = settings;
  const update = (patch: Partial<MapSettings>) => setSettings({ ...settings, ...patch });
  const updateGradient = (patch: Partial<HeatmapGradient>) =>
    update({ gradient: { ...gradient, ...patch } });

  return (
    <Popover>
      {/* SimpleTooltip has to stay on the outside. It isn't a forwardRef and it
          spreads its rest props onto the tooltip *content*, so making it the
          child of `PopoverTrigger asChild` sends the trigger's onClick and ref
          to the tooltip instead of to this button — and nothing opens. */}
      <SimpleTooltip label="Map settings">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Map settings"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-popover/80 text-foreground shadow hover:bg-popover"
          >
            <Settings size={18} />
          </button>
        </PopoverTrigger>
      </SimpleTooltip>

      <PopoverContent align="end" className="settings-popover w-72">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-heatmap"
                checked={settings.showHeatmap}
                onCheckedChange={checked => update({ showHeatmap: checked === true })}
              />
              <Label htmlFor="show-heatmap">Show heatmap</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-grid"
                checked={settings.showGrid}
                onCheckedChange={checked => update({ showGrid: checked === true })}
              />
              <Label htmlFor="show-grid">Show grid</Label>
            </div>
          </div>

          {showMetricSwitch && (
            <div className="setting-group">
              <Label>Measure</Label>
              <div className="segmented">
                {HEATMAP_METRICS.map(metric => (
                  <button
                    key={metric.value}
                    type="button"
                    className={settings.metric === metric.value ? 'active' : ''}
                    aria-pressed={settings.metric === metric.value}
                    onClick={() => update({ metric: metric.value })}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Everything below only affects the overlay, so it's pointless while
              the overlay is off. */}
          {settings.showHeatmap && (
            <>
              <div className="setting-group">
                <Label htmlFor="gradient-preset">Colours</Label>
                <select
                  id="gradient-preset"
                  className="settings-select"
                  value={gradient.preset}
                  onChange={event =>
                    updateGradient({ preset: event.target.value as HeatmapGradient['preset'] })
                  }
                >
                  {GRADIENT_PRESET_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                {gradient.preset === 'custom' && (
                  <CustomColorInputs gradient={gradient} onChange={g => update({ gradient: g })} />
                )}

                <GradientPreview gradient={gradient} />
              </div>

              <div className="setting-group">
                <Label>Range</Label>
                {/* Logarithmic track: each decade of tile weight gets an equal
                    share of the travel, so the low end is actually reachable. */}
                <Slider
                  value={[weightToSlider(gradient.range[0]), weightToSlider(gradient.range[1])]}
                  min={0}
                  max={RANGE_SLIDER_STEPS}
                  step={1}
                  minStepsBetweenThumbs={1}
                  onValueChange={([low, high]) =>
                    updateGradient({ range: [sliderToWeight(low), sliderToWeight(high)] })
                  }
                />
                <p className="setting-hint">
                  Tiles below {formatWeightPercent(gradient.range[0])} of the busiest tile are
                  left unpainted.
                </p>
              </div>

              <div className="setting-group">
                <Label>Intensity</Label>
                <Slider
                  value={[gradient.intensity]}
                  min={INTENSITY_BOUNDS.min}
                  max={INTENSITY_BOUNDS.max}
                  step={INTENSITY_BOUNDS.step}
                  onValueChange={([intensity]) => updateGradient({ intensity })}
                />
                <p className="setting-hint">
                  Higher values lift quieter tiles up the colour ramp.
                </p>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onResetView}
            className="reset-button text-sm underline underline-offset-2 hover:no-underline"
          >
            Reset view
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
