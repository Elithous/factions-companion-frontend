import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ToFromFaction } from '@/types/stats';

interface StatsTableProps {
  data: ToFromFaction;
  /** Optional caption above the grid. The card heading usually says enough. */
  title?: string;
}

interface StatsRow {
  from: string;
  to: string;
  total: number;
  /** Bar width, relative to the largest flow from the same faction. */
  barPercent: number;
  /** Share of everything this faction sent. */
  sharePercent: number;
  /** First row of a `from` group — carries the label and the divider. */
  isGroupStart: boolean;
}

/**
 * Flattens the nested totals into display rows.
 *
 * Rows are grouped by sending faction and sorted largest-first within each
 * group, so bar widths stay comparable to their neighbours rather than to some
 * unrelated faction's biggest push.
 */
function toRows(data: ToFromFaction): StatsRow[] {
  return Object.keys(data)
    .sort()
    .flatMap(from => {
      const entries = Object.entries(data[from])
        .map(([to, total]) => [to, total ?? 0] as const)
        .sort((a, b) => b[1] - a[1]);

      const maxValue = entries[0]?.[1] ?? 0;
      const groupTotal = entries.reduce((sum, [, total]) => sum + total, 0);

      return entries.map(([to, total], index) => ({
        from,
        to,
        total,
        barPercent: maxValue > 0 ? Math.round((total / maxValue) * 100) : 0,
        sharePercent: groupTotal > 0 ? Math.round((total / groupTotal) * 100) : 0,
        isGroupStart: index === 0,
      }));
    });
}

/** Faction-to-faction soldier totals, with an inline bar showing relative size. */
export default function StatsTable({ data, title }: StatsTableProps) {
  const rows = toRows(data);

  if (!rows.length) {
    return <p className="stats-empty">No soldier movement to report.</p>;
  }

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="stats-table-wrapper">
      <Table className="stats-table">
        {title && <caption className="stats-table-caption">{title}</caption>}

        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="numeric">Soldiers</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map(row => (
            <TableRow
              key={`${row.from}-${row.to}`}
              className={`stats-row${row.isGroupStart ? ' group-start' : ''}`}
            >
              {/* Repeated on every row rather than once per group: the solid
                  colour blocks are what make the groups legible at a glance, and
                  blanking them out leaves ragged holes in the column. */}
              <TableCell className={`faction ${row.from}`}>{row.from}</TableCell>
              <TableCell className={`faction ${row.to}`}>{row.to}</TableCell>
              <TableCell className="total numeric">
                <div className={`fill ${row.from}`} style={{ width: `${row.barPercent}%` }} />
                <span className="value">{row.total.toLocaleString()}</span>
                <span className="share">{row.sharePercent}%</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter>
          <TableRow className="stats-total-row">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="numeric">{grandTotal.toLocaleString()}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
