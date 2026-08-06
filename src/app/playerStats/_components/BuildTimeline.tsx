"use client";

import { useEffect, useMemo, useState } from 'react';

import BuildingIcon from '@/components/features/game/BuildingIcon';
import { Card } from '@/components/ui/card';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { formatBuildingName, type BuildingCategoryMap } from '@/lib/game/buildingAssets';
import type { BuildActivity } from '@/types/player';

import { useDragScroll } from '../_hooks/useDragScroll';

type StepType = 'build' | 'upgrade' | 'delete';

/**
 * One box on the scrubber, which may stand for several build activities.
 *
 * Taking a building from level 1 to 10 is nine separate upgrade records; shown
 * one-per-box they swamp the timeline and bury everything else the player did.
 * A run of consecutive upgrades to the same building collapses into a single
 * box spanning `startIndex`..`endIndex`.
 */
interface TimelineStep {
  type: StepType;
  buildingName: string;
  fromLevel?: number;
  toLevel?: number;
  /** How many activities this box represents. */
  count: number;
  /** First activity index covered, into `buildActivities`. */
  startIndex: number;
  /** Last activity index covered. Scrubbing here replays the whole run. */
  endIndex: number;
}

interface BuildTimelineProps {
  timelineSteps: BuildActivity[] | undefined;
  currentStep: number;
  onStepChange: (step: number) => void;
  /** The selected game's building catalogue, for the category frames. */
  categories?: BuildingCategoryMap;
}

/**
 * Fixed width of each timeline box, in px.
 *
 * Wider than it needs to be for a bare icon: the box holds a building sprite
 * plus an action badge, and below this they start colliding.
 *
 * Must match `--timeline-box-size` in playerStats.scss, which sizes the bar
 * around it. Used here for absolute positioning and scroll-centring maths.
 */
const BOX_WIDTH = 48;

const STEP_TYPES: Partial<Record<BuildActivity['type'], StepType>> = {
  building_built: 'build',
  building_upgraded: 'upgrade',
  hq_upgraded: 'upgrade',
  building_destroyed: 'delete',
};

/**
 * The sprite now fills the box, so the action has to be legible on top of
 * arbitrary artwork. Build and upgrade were both green and both used to rely on
 * the tooltip to tell them apart; they get distinct glyphs and colours here
 * since the background can no longer carry that meaning.
 */
const STEP_ICONS: Record<StepType, string> = { build: '+', upgrade: '▲', delete: '✕' };

const STEP_COLORS: Record<StepType, string> = {
  build: '#2f9e44',
  upgrade: '#1971c2',
  delete: '#c92a2a',
};

function toTimeline(activities: BuildActivity[]): TimelineStep[] {
  const steps: TimelineStep[] = [];

  activities.forEach((activity, index) => {
    const type = STEP_TYPES[activity.type];
    if (!type) return;

    const buildingName = activity.name || (activity.type === 'hq_upgraded' ? 'HQ' : '');
    const previous = steps[steps.length - 1];

    // Only fold in upgrades, and only when they continue the immediately
    // preceding box for the same building. Requiring strict adjacency in the
    // activity log keeps the scrubber chronological — upgrading a farm, building
    // a mine, then upgrading the farm again stays three boxes.
    const continuesRun =
      type === 'upgrade' &&
      previous !== undefined &&
      previous.type !== 'delete' &&
      previous.buildingName === buildingName &&
      previous.endIndex === index - 1;

    if (continuesRun) {
      previous.count += 1;
      previous.endIndex = index;
      previous.toLevel = activity.level;
      return;
    }

    steps.push({
      type,
      buildingName,
      fromLevel: type === 'upgrade' ? activity.level - 1 : undefined,
      toLevel: type === 'delete' ? undefined : activity.level,
      count: 1,
      startIndex: index,
      endIndex: index,
    });
  });

  return steps;
}

function describeStep(step: TimelineStep): string {
  const name = formatBuildingName(step.buildingName);

  switch (step.type) {
    case 'build':
      // A build that absorbed later upgrades reports where it ended up.
      return step.count > 1
        ? `Built ${name}, upgraded to level ${step.toLevel} (${step.count} steps)`
        : `Built ${name}`;
    case 'upgrade':
      return step.count > 1
        ? `Upgraded ${name} level ${step.fromLevel} -> ${step.toLevel} (${step.count} steps)`
        : `Upgraded ${name} level ${step.fromLevel} -> ${step.toLevel}`;
    case 'delete':
      return `Deleted ${name}`;
  }
}

/** Horizontal scrubber over a player's build history. */
export default function BuildTimeline({
  timelineSteps,
  currentStep,
  onStepChange,
  categories,
}: BuildTimelineProps) {
  const { ref, isDragging, onMouseDown, centerOn } = useDragScroll<HTMLDivElement>();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const timeline = useMemo(() => toTimeline(timelineSteps ?? []), [timelineSteps]);

  // `currentStep` is an activity index, not a box index — one box can cover
  // several activities, so the active box is whichever one's range contains it.
  const activeBox = useMemo(() => {
    const found = timeline.findIndex(
      step => currentStep >= step.startIndex && currentStep <= step.endIndex,
    );
    // Past the end of a run (or before the first box) fall back to the nearest
    // box that has already happened, so the scrubber never loses its place.
    if (found !== -1) return found;

    let fallback = -1;
    timeline.forEach((step, index) => {
      if (step.endIndex <= currentStep) fallback = index;
    });
    return fallback;
  }, [timeline, currentStep]);

  useEffect(() => {
    if (activeBox < 0) return;
    centerOn(activeBox * BOX_WIDTH, BOX_WIDTH);
  }, [activeBox, centerOn]);

  return (
    <Card className="build-timeline-container">
      <div
        ref={ref}
        className={`timeline-bar-container ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
      >
        {/* Only the content width is dynamic; heights and padding live in the
            stylesheet so the bar's chrome can be tuned in one place. */}
        <div
          className="timeline-bar-content"
          style={{ width: `${timeline.length * BOX_WIDTH}px` }}
        >
          {timeline.map((step, index) => {
            const isActive = index === activeBox;

            return (
              <SimpleTooltip key={step.startIndex} label={describeStep(step)} side="top">
                <div
                  className={`timeline-step ${isActive ? 'active' : ''} ${index === hoveredStep ? 'hovered' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${index * BOX_WIDTH}px`,
                    width: `${BOX_WIDTH}px`,
                    height: `${BOX_WIDTH}px`,
                  }}
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onClick={e => {
                    e.stopPropagation();
                    // The end of the run, so the village shows the finished
                    // upgrade rather than its first step.
                    onStepChange(step.endIndex);
                  }}
                >
                  <BuildingIcon
                    buildingName={step.buildingName}
                    categories={categories}
                    // The level this step reached, so an HQ box shows the
                    // artwork for the tier it was at.
                    level={step.toLevel}
                    size={BOX_WIDTH}
                  >
                    {/* Corner badges rather than a tinted background: the sprite
                        owns the middle of the box now, and a wash over it would
                        fight the category frame's colour. */}
                    <span
                      className="timeline-step-action"
                      style={{ backgroundColor: STEP_COLORS[step.type] }}
                      aria-label={step.type}
                    >
                      {STEP_ICONS[step.type]}
                    </span>

                    {step.type === 'delete' && <span className="timeline-step-strike" />}

                    {step.count > 1 && (
                      <span className="timeline-step-count">
                        {step.type === 'upgrade' || step.type === 'build'
                          ? `L${step.toLevel}`
                          : step.count}
                      </span>
                    )}
                  </BuildingIcon>
                </div>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
