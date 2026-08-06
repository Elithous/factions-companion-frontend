import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building,
  BuildingCatalogue,
  GameConfig,
  MultiplierValues,
  StorageTypes,
  getEffectiveCombatStrength,
  getTotalOutput,
  getTotalStorage,
} from '@/lib/game';

interface OutputTableProps {
  title: string;
  buildings: Building[];
  config: GameConfig | undefined;
  /** The selected game's catalogue; effects are read from it. */
  catalogue: BuildingCatalogue | undefined;
}

const capitalize = (value: string) => `${value[0].toUpperCase()}${value.substring(1)}`;

/**
 * Per-tick production and storage for one build, plus the effective attack and
 * defense strength once world bonuses are applied.
 */
export default function OutputTable({ title, buildings, config, catalogue }: OutputTableProps) {
  if (!config) return null;

  const output = getTotalOutput(catalogue, buildings, config);
  const storage = getTotalStorage(catalogue, buildings, config);
  const combat = getEffectiveCombatStrength(catalogue, buildings, config);

  return (
    <div className='outputs'>
      <p className='title'>{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Storage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MultiplierValues.map(value => (
            <TableRow key={value}>
              <TableCell>{capitalize(value)}</TableCell>
              <TableCell>{output[value].base.toFixed(2)}</TableCell>
              <TableCell>{output[value].final.toFixed(2)}</TableCell>
              <TableCell>{storage[value as StorageTypes]?.final.toFixed(0)}</TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell>Effective Attack</TableCell>
            <TableCell>{combat.soldiers.toFixed(2)}</TableCell>
            <TableCell>{combat.attack.toFixed(2)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Effective Defense</TableCell>
            <TableCell>{combat.soldiers.toFixed(2)}</TableCell>
            <TableCell>{combat.defense.toFixed(2)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
