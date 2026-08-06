import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { StatsFilter, ToFromFaction } from '@/types/stats';

import StatsTable from './StatsTable';
import './stats.scss';

interface StatsPanelProps {
  filter: StatsFilter;
  data: {
    total: ToFromFaction;
    filtered: ToFromFaction;
  };
}

const formatDateRange = (start: number, end: number) =>
  `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;

/** Summary of the active filters, as a row of badges. */
function ActiveFilterBadges({ filter }: { filter: StatsFilter }) {
  return (
    <div className='active-filters'>
      {filter.dateRange && (
        <Badge variant="outline">{formatDateRange(filter.dateRange[0], filter.dateRange[1])}</Badge>
      )}
      {filter.playerId !== undefined && (
        <Badge variant="outline">Player: {filter.playerName ?? filter.playerId}</Badge>
      )}
      {filter.fromFaction && <Badge variant="outline">From: {filter.fromFaction}</Badge>}
      {filter.toFaction && <Badge variant="outline">To: {filter.toFaction}</Badge>}
      {filter.tile && <Badge variant="outline">Tile: ({filter.tile.x}, {filter.tile.y})</Badge>}
    </div>
  );
}

/**
 * Unfiltered and filtered faction totals.
 *
 * The two cards sit side by side once the container has room for them and stack
 * below that — the grid in `stats.scss` handles the switch, so this must not set
 * its own display mode here.
 */
export default function StatsPanel({ filter, data }: StatsPanelProps) {
  const hasActiveFilters = Object.keys(filter).length > 0;

  return (
    <div className='stats-container'>
      {data?.total && (
        <Card className='faction-totals stats-card'>
          <div className="stats-card-header">
            <p className="stats-card-title">Total Statistics</p>
          </div>
          <StatsTable data={data.total} />
        </Card>
      )}

      {data?.filtered && (
        <Card className='filtered-totals stats-card'>
          <div className="stats-card-header">
            <p className="stats-card-title">Filtered Statistics</p>
            {hasActiveFilters && <Badge className="bg-primary/20 text-primary">Active Filters</Badge>}
          </div>

          {hasActiveFilters && <ActiveFilterBadges filter={filter} />}

          <StatsTable data={data.filtered} />
        </Card>
      )}
    </div>
  );
}
