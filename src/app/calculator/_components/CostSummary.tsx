import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { NumberInput } from '@/components/ui/number-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScalingTypes, ScalingValues } from '@/lib/game';

import type { BuildRequirements } from '../_hooks/useBuildRequirements';

interface CostSummaryProps {
  requirements: BuildRequirements | null;
  currentResources: { [key in ScalingTypes]: number };
  setResource: (resource: ScalingTypes, value: number) => void;
}

const capitalize = (value: string) => `${value[0].toUpperCase()}${value.substring(1)}`;

/** What's still needed to reach the goal build, and how many ticks that takes. */
export default function CostSummary({ requirements, currentResources, setResource }: CostSummaryProps) {
  if (!requirements) return null;

  return (
    <div className='costs'>
      <p className='title'>Cost</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Needed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ScalingValues.map(resource => (
            <TableRow key={resource}>
              <TableCell>{capitalize(resource)}:</TableCell>
              <TableCell>
                <NumberInput
                  style={{ width: '120px', marginLeft: 'auto' }}
                  value={currentResources[resource]}
                  onValueChange={v => setResource(resource, v.floatValue || 0)}
                  allowNegative={false}
                />
              </TableCell>
              <TableCell>{requirements.remainingCosts[resource]}</TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell>Ticks:</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">
              <HoverCard openDelay={100} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <span className="cursor-default text-sm underline decoration-dotted">
                    {requirements.totalTicks}
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <p className="text-sm">Wood: {Math.max(requirements.ticks.wood, 0)}</p>
                  <p className="text-sm">Iron: {Math.max(requirements.ticks.iron, 0)}</p>
                  <p className="text-sm">Workers: {Math.max(requirements.ticks.worker, 0)}</p>
                </HoverCardContent>
              </HoverCard>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
