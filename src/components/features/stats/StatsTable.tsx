import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ToFromFaction } from '@/types/stats';

interface StatsTableProps {
  data: ToFromFaction;
  title: string;
}

/** Faction-to-faction soldier totals, with an inline bar showing relative size. */
export default function StatsTable({ data, title }: StatsTableProps) {
  if (Object.keys(data).length === 0) return null;

  const tableRows = Object.keys(data)
    .sort()
    .flatMap(from => {
      // Sort by amount sent, largest first, so the bar widths are relative to it.
      const toValues = Object.entries(data[from]).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
      const maxValue = toValues[0]?.[1] ?? 0;

      return toValues.map(([to, total]) => {
        const percentFilled = maxValue > 0 ? Math.round((total / maxValue) * 100) : 0;

        return (
          <TableRow key={`${from}-${to}`} className='stats-row'>
            <TableCell className='total'>
              <div className={`fill ${from}`} style={{ width: `${percentFilled}%` }} />
              <div className='value'>{total.toLocaleString()}</div>
            </TableCell>
            <TableCell className={`faction ${from}`}>{from}</TableCell>
            <TableCell className={`faction ${to}`}>{to}</TableCell>
          </TableRow>
        );
      });
    });

  return (
    <Table className='stats-table'>
      <TableHeader>
        <TableRow>
          <TableHead colSpan={3} className="text-center text-lg font-medium">{title}</TableHead>
        </TableRow>
        <TableRow>
          <TableHead>Total</TableHead>
          <TableHead>From Faction</TableHead>
          <TableHead>To Faction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{tableRows}</TableBody>
    </Table>
  );
}
