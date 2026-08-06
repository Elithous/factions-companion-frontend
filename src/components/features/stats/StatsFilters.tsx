'use client'

import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from "react";

import { getActivePlayerOptions } from '@/lib/api/reports';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { StatsFilter } from '@/types/stats';

import './filters.scss';

export interface StatsFiltersProps {
  gameId: string;
  /** Full available range for the game — the slider bounds. */
  dateRange: [number, number];
  filter: StatsFilter;
  updateFilter: (rule: StatsFilter) => void;
  onReset?: () => void;
}

const FACTION_OPTIONS = [
  { value: 'all', label: 'All Factions' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
] as const;

/**
 * A bound is only worth filtering on if the user moved it meaningfully away
 * from the game's own start/end.
 */
const BOUND_TOLERANCE_MS = 60;

function FactionSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: StatsFilter['fromFaction']) => void;
}) {
  return (
    <div className='faction-filter filter flex flex-col gap-1'>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Select
        value={value || 'all'}
        onValueChange={v => onChange(v === 'all' ? undefined : v as StatsFilter['fromFaction'])}
      >
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {FACTION_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function StatsFilters({
  gameId,
  dateRange: bounds,
  filter,
  updateFilter,
  onReset,
}: StatsFiltersProps) {
  const [player, setPlayer] = useState<string | null>(null);
  const [playerList, setPlayerList] = useState<ComboboxOption[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // `range` is the committed selection; start/end track the slider while dragging.
  const [range, setRange] = useState<[number, number]>(bounds);
  const [dateStart, setDateStart] = useState<number>(bounds?.[0]);
  const [dateEnd, setDateEnd] = useState<number>(bounds?.[1]);

  useEffect(() => {
    setRange(bounds);
  }, [bounds]);

  useEffect(() => {
    if (filter.playerId === undefined) setPlayer(null);
  }, [filter]);

  useEffect(() => {
    setDateStart(range[0]);
    setDateEnd(range[1]);

    // Drop bounds the user hasn't actually moved.
    const start = Math.abs(range[0] - bounds[0]) < BOUND_TOLERANCE_MS ? null : range[0];
    const end = Math.abs(range[1] - bounds[1]) < BOUND_TOLERANCE_MS ? null : range[1];

    const nextRange: [number, number] | undefined =
      start !== null || end !== null ? [start ?? bounds[0], end ?? bounds[1]] : undefined;

    // Bail out if nothing changed. Calling updateFilter unconditionally builds
    // a new filter object every run, which re-renders this component and loops.
    const prevRange = filter.dateRange;
    const isSame = nextRange === undefined
      ? prevRange === undefined
      : prevRange !== undefined && nextRange[0] === prevRange[0] && nextRange[1] === prevRange[1];

    if (!isSame) updateFilter({ dateRange: nextRange });
  }, [range[0], range[1]]);

  useEffect(() => {
    if (!gameId) {
      setPlayerList([]);
      return;
    }

    getActivePlayerOptions(gameId)
      .then(setPlayerList)
      .catch(error => console.error('Error fetching players:', error));
  }, [gameId]);

  // `player` holds the combobox value, which is the player id as a string.
  useEffect(() => {
    const playerId = player ? Number(player) : undefined;
    if (filter.playerId === playerId) return;

    updateFilter({
      playerId,
      playerName: playerList.find(option => option.value === player)?.label,
    });
  }, [player, playerList]);

  const handleReset = useCallback(() => {
    setPlayer(null);
    setRange(bounds);
    onReset?.();
  }, [bounds, onReset]);

  return (
    <div className='filters-container'>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-medium">Filters</p>
        <div className="flex items-center gap-2">
          <SimpleTooltip label="Toggle advanced filters">
            <Button variant="ghost" onClick={() => setIsExpanded(prev => !prev)}>
              {isExpanded ? 'Hide Advanced' : 'Show Advanced'}
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </SimpleTooltip>
          <SimpleTooltip label="Reset all filters">
            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              onClick={handleReset}
              disabled={!Object.keys(filter).length}
            >
              <RotateCcw size={16} />
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className='basic-filters'>
          <FactionSelect
            id='from-faction-select'
            label='From Faction'
            value={filter?.fromFaction}
            onChange={v => updateFilter({ fromFaction: v })}
          />
          <FactionSelect
            id='to-faction-select'
            label='To Faction'
            value={filter?.toFaction}
            onChange={v => updateFilter({ toFaction: v })}
          />

          <div className='player-filter filter flex flex-col gap-1'>
            <label htmlFor='name-input' className="text-sm font-medium">Player Name</label>
            <Combobox
              id='name-input'
              value={player}
              onChange={setPlayer}
              options={playerList}
              placeholder="Select player..."
              searchPlaceholder="Search players..."
            />
          </div>
        </div>

        <div className={`advanced-filters ${isExpanded ? 'expanded' : ''}`}>
          <div className='time-filter filter'>
            <p className="mb-2 text-sm font-medium">Time Range</p>
            <div className='date-inputs flex flex-wrap justify-between gap-4'>
              <DateTimePicker
                className='timespan-picker'
                value={dateStart ? new Date(dateStart) : null}
                onChange={d => setRange([d?.getTime() || dateStart, dateEnd])}
                minDate={new Date(bounds[0])}
                maxDate={new Date(bounds[1])}
                label='Start Date'
                placeholder='Start Date'
              />
              <DateTimePicker
                className='timespan-picker'
                value={dateEnd ? new Date(dateEnd) : null}
                onChange={d => setRange([dateStart, d?.getTime() || dateEnd])}
                minDate={new Date(bounds[0])}
                maxDate={new Date(bounds[1])}
                label='End Date'
                placeholder='End Date'
              />
            </div>
            <Slider
              className="mt-4"
              onValueChange={v => { setDateStart(v[0]); setDateEnd(v[1]); }}
              onValueCommit={v => setRange([v[0], v[1]])}
              value={[dateStart, dateEnd]}
              minStepsBetweenThumbs={1}
              step={60}
              min={bounds?.[0]}
              max={bounds?.[1]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
