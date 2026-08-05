"use client"

import { GripVertical, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useDebouncedEffect } from '@/hooks/useDebouncedEffect';
import { Building, BuildingData, BuildingNameType, BuildingOptions } from '@/lib/game';

/** How long to wait after the last keystroke before pushing edits upward. */
const EDIT_DEBOUNCE_MS = 300;

export interface BuildingRowProps {
  data: Building;
  updateData: (row: Building) => void;
  /** True when the village is at its building cap. */
  disableCount: boolean;
  id: string;
  onSplit: (building: Building) => void;
  onRemove: (id: number) => void;
}

/** One draggable building stack: type, count and level. */
export default function BuildingRow({
  data,
  updateData,
  disableCount,
  id,
  onSplit,
  onRemove,
}: BuildingRowProps) {
  const [type, setType] = useState<BuildingNameType | null>(data.type);
  const [count, setCount] = useState<number>(data.count);
  const [level, setLevel] = useState<number>(data.level);
  const [countDisabled, setCountDisabled] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  // Unique buildings can only ever have a count of one.
  useEffect(() => {
    if (type === data.type) return;

    const buildingData = BuildingData.find(building => building.name === type);
    if (buildingData?.unique) {
      setCountDisabled(true);
      setCount(1);
    } else {
      setCountDisabled(false);
    }
  }, [type]);

  useDebouncedEffect(
    () => updateData({ id: data.id, type, count: +count, level: +level, sortOrder: data.sortOrder }),
    [type, count, level],
    EDIT_DEBOUNCE_MS,
  );

  useEffect(() => {
    setType(data.type);
    setCount(data.count);
    setLevel(data.level);
  }, [data]);

  const canSplit = data.count > 1;

  return (
    <Card ref={setNodeRef} style={style} className="building-row flex items-center justify-between gap-2 p-2">
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <GripVertical size={20} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Building</Label>
          <Combobox
            value={type}
            onChange={v => setType(v as BuildingNameType)}
            options={BuildingOptions}
            clearable={false}
            triggerClassName="w-48"
          />
        </div>

        <NumberInput
          className="w-[70px]"
          label='Count'
          value={count}
          onChange={setCount}
          max={disableCount ? count : undefined}
          allowNegative={false}
          disabled={countDisabled}
        />
        <NumberInput
          className="w-[70px]"
          label='Level'
          value={level}
          onChange={setLevel}
          allowNegative={false}
        />
      </div>

      <div className="flex items-center gap-2">
        <SimpleTooltip label={canSplit ? "Split this stack in half" : undefined} disabled={!canSplit}>
          <Button variant="secondary" size="sm" disabled={!canSplit} onClick={() => onSplit(data)}>
            Split
          </Button>
        </SimpleTooltip>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          aria-label="Remove building"
          onClick={() => onRemove(data.id)}
        >
          <X size={16} />
        </Button>
      </div>
    </Card>
  );
}
