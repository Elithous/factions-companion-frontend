import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { StatsFilter, ToFromFaction } from '@/types/stats';

import StatsTable from './StatsTable';
// @ts-ignore: SCSS side-effect import without module declarations
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
    <div className='active-filters mb-4 flex flex-wrap gap-2'>
      {filter.dateRange && (
        <Badge variant="outline">{formatDateRange(filter.dateRange[0], filter.dateRange[1])}</Badge>
      )}
      {filter.playerName && <Badge variant="outline">Player: {filter.playerName}</Badge>}
      {filter.fromFaction && <Badge variant="outline">From: {filter.fromFaction}</Badge>}
      {filter.toFaction && <Badge variant="outline">To: {filter.toFaction}</Badge>}
      {filter.tile && <Badge variant="outline">Tile: ({filter.tile.x}, {filter.tile.y})</Badge>}
    </div>
  );
}

/** Side-by-side unfiltered and filtered faction totals. */
export default function StatsPanel({ filter, data }: StatsPanelProps) {
  const hasActiveFilters = Object.keys(filter).length > 0;

  return (
    <div className='stats-container flex flex-col gap-6'>
      {data?.total && (
        <Card className='faction-totals p-4 shadow-sm'>
          <p className="mb-4 text-lg font-medium">Total Statistics</p>
          <StatsTable data={data.total} title="Totals by Faction" />
        </Card>
      )}

      {data?.filtered && (
        <Card className='filtered-totals p-4 shadow-sm'>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-medium">Filtered Statistics</p>
            {hasActiveFilters && <Badge className="bg-primary/20 text-primary">Active Filters</Badge>}
          </div>

          {hasActiveFilters && <ActiveFilterBadges filter={filter} />}

          <StatsTable data={data.filtered} title="Filtered Results" />
        </Card>
      )}
    </div>
  );
}
