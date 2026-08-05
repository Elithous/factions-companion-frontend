import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface SimpleTableData {
  head: string[];
  body: (string | number)[][];
}

/** Renders a plain header/body grid — no per-cell customisation. */
export function SimpleTable({ data, className }: { data?: SimpleTableData; className?: string }) {
  if (!data) return null;

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {data.head.map((heading, i) => <TableHead key={i}>{heading}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.body.map((row, i) => (
          <TableRow key={i}>
            {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
