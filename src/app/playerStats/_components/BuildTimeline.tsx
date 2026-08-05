"use client";

import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { BuildActivity } from '@/types/player';

import { useDragScroll } from '../_hooks/useDragScroll';

type StepType = 'build' | 'upgrade' | 'delete';

interface TimelineStep {
  id: number;
  type: StepType;
  buildingName: string;
  fromLevel?: number;
  toLevel?: number;
}

interface BuildTimelineProps {
  timelineSteps: BuildActivity[] | undefined;
  currentStep: number;
  onStepChange: (step: number) => void;
}

/** Fixed width of each timeline box, in px. */
const BOX_WIDTH = 40;

const STEP_TYPES: Partial<Record<BuildActivity['type'], StepType>> = {
  building_built: 'build',
  building_upgraded: 'upgrade',
  hq_upgraded: 'upgrade',
  building_destroyed: 'delete',
};

const STEP_ICONS: Record<StepType, string> = { build: '+', upgrade: '✓', delete: '✕' };

const STEP_COLORS: Record<StepType, string> = {
  build: '#51cf66',
  upgrade: '#51cf66',
  delete: '#ff6b6b',
};

function toTimeline(activities: BuildActivity[]): TimelineStep[] {
  return activities.flatMap((activity, index) => {
    const type = STEP_TYPES[activity.type];
    if (!type) return [];

    return [{
      id: index,
      type,
      buildingName: activity.name,
      fromLevel: type === 'upgrade' ? activity.level - 1 : undefined,
      toLevel: type === 'delete' ? undefined : activity.level,
    }];
  });
}

function describeStep(step: TimelineStep): string {
  switch (step.type) {
    case 'build':
      return `Built ${step.buildingName}`;
    case 'upgrade':
      return `Upgraded ${step.buildingName || 'HQ'} Level ${step.fromLevel} -> ${step.toLevel}`;
    case 'delete':
      return `Deleted ${step.buildingName}`;
  }
}

/** Horizontal scrubber over a player's build history. */
export default function BuildTimeline({ timelineSteps, currentStep, onStepChange }: BuildTimelineProps) {
  const { ref, isDragging, onMouseDown, centerOn } = useDragScroll<HTMLDivElement>();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const timeline = useMemo(() => toTimeline(timelineSteps ?? []), [timelineSteps]);

  useEffect(() => {
    centerOn(currentStep * BOX_WIDTH, BOX_WIDTH);
  }, [currentStep, centerOn]);

  return (
    <Card className="build-timeline-container p-4">
      <div
        ref={ref}
        className="timeline-bar-container"
        onMouseDown={onMouseDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          height: `${BOX_WIDTH}px`,
          paddingBottom: '55px',
        }}
      >
        <div
          className="timeline-bar-content"
          style={{
            position: 'relative',
            width: `${timeline.length * BOX_WIDTH}px`,
            height: `${BOX_WIDTH}px`,
          }}
        >
          {timeline.map((step, index) => {
            const isActive = index === currentStep;

            return (
              <SimpleTooltip key={step.id} label={describeStep(step)} side="top">
                <div
                  className={`timeline-step ${isActive ? 'active' : ''} ${index === hoveredStep ? 'hovered' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${index * BOX_WIDTH}px`,
                    width: `${BOX_WIDTH}px`,
                    height: `${BOX_WIDTH}px`,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: STEP_COLORS[step.type],
                    opacity: isActive ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onClick={e => {
                    e.stopPropagation();
                    onStepChange(index);
                  }}
                >
                  <span className="text-xs font-bold text-white">{STEP_ICONS[step.type]}</span>
                </div>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
