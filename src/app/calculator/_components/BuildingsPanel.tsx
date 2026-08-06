"use client"

import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Building, BuildingCatalogue } from '@/lib/game';

import BuildingRow from './BuildingRow';

export interface BuildingsPanelProps {
  buildings: Building[];
  /** The selected game's catalogue, forwarded to each row's picker. */
  catalogue: BuildingCatalogue | undefined;
  setBuildings: (buildings: Building[]) => void;
  hq: number;
  setHq: (hq: number) => void;
}

/** Renumber `sortOrder` to match array order. */
const withSortOrder = (buildings: Building[]): Building[] =>
  buildings.map((building, index) => ({ ...building, sortOrder: index }));

const nextId = (buildings: Building[]) =>
  buildings.length > 0 ? buildings[buildings.length - 1].id + 1 : 1;

/** Editable, drag-sortable list of building stacks for one side of a build. */
export default function BuildingsPanel({
  buildings,
  catalogue,
  setBuildings,
  hq,
  setHq,
}: BuildingsPanelProps) {
  const totalBuildings = buildings.reduce((total, building) => total + building.count, 0);
  const addDisabled = totalBuildings >= hq;

  // Backfill sortOrder for builds saved before it existed.
  useEffect(() => {
    if (buildings.length && !buildings.some(b => 'sortOrder' in b)) {
      setBuildings(withSortOrder(buildings));
    }
  }, []);

  const handleAddRow = () => {
    setBuildings([
      ...buildings,
      { id: nextId(buildings), type: null, count: 1, level: 1, sortOrder: buildings.length },
    ]);
  };

  const handleRemoveRow = (id: number) => {
    setBuildings(withSortOrder(buildings.filter(row => row.id !== id)));
  };

  const handleUpdateRow = (row: Building) => {
    setBuildings(buildings.map(building => (row.id === building.id ? row : building)));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = buildings.findIndex(b => b.id.toString() === active.id);
    const newIndex = buildings.findIndex(b => b.id.toString() === over.id);
    setBuildings(withSortOrder(arrayMove(buildings, oldIndex, newIndex)));
  };

  /** Split a stack roughly in half so the two halves can diverge in level. */
  const handleSplitBuilding = (building: Building) => {
    if (building.count <= 1) return;

    const firstHalf = Math.floor(building.count / 2);
    const updated = buildings.map(b => (b.id === building.id ? { ...b, count: firstHalf } : b));

    setBuildings([
      ...updated,
      {
        id: nextId(updated),
        type: building.type,
        count: building.count - firstHalf,
        level: building.level,
        sortOrder: updated.length,
      },
    ]);
  };

  const sortedBuildings = [...buildings].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="w-full rounded-md border-4 border-black p-1">
      <div className="hq-level flex items-center justify-center gap-2 p-2">
        <Label>HQ Level</Label>
        <NumberInput className="w-[60px]" value={hq} onChange={setHq} min={totalBuildings} />
      </div>

      <ScrollArea className="h-[500px]">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={buildings.map(b => b.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1 p-1">
              {sortedBuildings.map(building => (
                <BuildingRow
                  key={building.id}
                  id={building.id.toString()}
                  data={building}
                  catalogue={catalogue}
                  updateData={handleUpdateRow}
                  disableCount={addDisabled}
                  onSplit={handleSplitBuilding}
                  onRemove={handleRemoveRow}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button className="mt-2" disabled={addDisabled} onClick={handleAddRow} aria-label="Add building">
          <Plus size={16} />
        </Button>
      </ScrollArea>
    </div>
  );
}
