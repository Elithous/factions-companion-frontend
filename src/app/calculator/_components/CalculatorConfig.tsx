"use client"

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import GameSelect from "@/components/features/game/GameSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getGameConfig } from '@/lib/api/reports';
import {
  GameConfig,
  MultiplierMap,
  MultiplierValues,
  ScalingValues,
  StorageValues,
  WorldEffectValues,
  configFromApi,
  createDefaultConfig,
  defaultConfig,
} from '@/lib/game';

interface CalculatorConfigProps {
  config?: GameConfig;
  setConfig: Dispatch<SetStateAction<GameConfig | undefined>>;
}

/** Bounds of the "simulate cost change" slider. */
const COST_CHANGE = { min: 0.92, max: 0.98, step: 0.00001, default: 0.92 } as const;

const capitalize = (value: string) => `${value[0].toUpperCase()}${value.substring(1)}`;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-xl font-bold">{children}</p>;
}

/**
 * An editable `+% / x` grid over one multiplier bucket. Used for production,
 * storage and world effects, which are all the same shape.
 */
function MultiplierTable<K extends string>({
  title,
  keys,
  values,
  onChange,
}: {
  title: string;
  keys: readonly K[];
  values: MultiplierMap<K>;
  onChange: (key: K, field: 'percent' | 'final', value: number) => void;
}) {
  return (
    <>
      <SectionHeading>{title}</SectionHeading>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead className="text-center">+%</TableHead>
            <TableHead className="text-center">X</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map(key => (
            <TableRow key={key}>
              <TableCell>{capitalize(key)}</TableCell>
              <TableCell>
                <NumberInput
                  style={{ width: '70px' }}
                  value={values[key].percent}
                  onValueChange={e => onChange(key, 'percent', e.floatValue || 0)}
                  decimalScale={1}
                  fixedDecimalScale
                  hideControls
                />
              </TableCell>
              <TableCell>
                <NumberInput
                  style={{ width: '70px' }}
                  value={values[key].final}
                  onValueChange={e => onChange(key, 'final', e.floatValue || 1)}
                  decimalScale={2}
                  fixedDecimalScale
                  hideControls
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

/** Cost-scaling and multiplier editor for the calculator. */
export default function CalculatorConfig({ config, setConfig }: CalculatorConfigProps) {
  const [gameId, setGameId] = useState('');
  const [localConfig, setLocalConfig] = useState<GameConfig>(
    config ? { ...config } : createDefaultConfig(),
  );
  const [useCostChange, setUseCostChange] = useState(config?.useCostChange ?? false);
  const [costChange, setCostChange] = useState<number>(config?.costChange || COST_CHANGE.default);

  // Push every edit straight up — the popover can be dismissed at any time.
  useEffect(() => {
    setConfig({ ...localConfig, useCostChange, costChange });
  }, [localConfig, useCostChange, costChange, setConfig]);

  // Selecting a game replaces the cost scaling with that game's parameters.
  useEffect(() => {
    if (!gameId) return;

    getGameConfig(gameId)
      .then(data => setLocalConfig(prev => configFromApi(data, prev)))
      .catch(error => console.error('Error loading game config:', error));
  }, [gameId]);

  const resetConfig = () => {
    setLocalConfig(createDefaultConfig());
    setCostChange(COST_CHANGE.default);
    setUseCostChange(false);
  };

  const updateMultiplier = <K extends keyof Pick<GameConfig, 'prod_multi' | 'storage_multi' | 'world_multi'>>(
    bucket: K,
  ) => (key: string, field: 'percent' | 'final', value: number) => {
    setLocalConfig(prev => {
      const next = structuredClone(prev);
      (next[bucket] as Record<string, { percent: number; final: number }>)[key][field] = value;
      return next;
    });
  };

  const updateCostMulti = (target: 'hq' | 'building', resource: typeof ScalingValues[number], value: number) => {
    setLocalConfig(prev => {
      const next = structuredClone(prev);
      next.cost_multi[target][resource] = value;
      return next;
    });
  };

  return (
    <div className='calc-config flex flex-col gap-3' suppressHydrationWarning>
      <SectionHeading>Level Scaling</SectionHeading>

      <div className="flex items-center gap-2">
        <p className="pr-2">Set from Game:</p>
        <GameSelect gameId={gameId} setGameId={setGameId} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>HQ</TableHead>
            <TableHead>Building</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ScalingValues.map(type => (
            <TableRow key={type}>
              <TableCell>{capitalize(type)}</TableCell>
              {(['hq', 'building'] as const).map(target => (
                <TableCell key={target}>
                  <NumberInput
                    style={{ width: '70px' }}
                    value={localConfig.cost_multi?.[target]?.[type] || 1}
                    onValueChange={e => updateCostMulti(target, type, e.floatValue || 1)}
                    decimalScale={4}
                    fixedDecimalScale
                    hideControls
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Checkbox
          id="simulate-cost-change"
          checked={useCostChange}
          onCheckedChange={checked => setUseCostChange(checked === true)}
        />
        <Label htmlFor="simulate-cost-change">Simulate cost change</Label>
      </div>

      <div className="mb-4">
        <Slider
          disabled={!useCostChange}
          value={[costChange]}
          onValueChange={v => setCostChange(v[0])}
          step={COST_CHANGE.step}
          min={COST_CHANGE.min}
          max={COST_CHANGE.max}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{COST_CHANGE.min * 100}%</span>
          <span>{(costChange * 100).toPrecision(4)}%</span>
          <span>{COST_CHANGE.max * 100}%</span>
        </div>
      </div>

      <MultiplierTable
        title="Stat Multis"
        keys={MultiplierValues}
        values={localConfig.prod_multi ?? defaultConfig.prod_multi}
        onChange={updateMultiplier('prod_multi')}
      />
      <MultiplierTable
        title="Storage Multis"
        keys={StorageValues}
        values={localConfig.storage_multi ?? defaultConfig.storage_multi}
        onChange={updateMultiplier('storage_multi')}
      />
      <MultiplierTable
        title="World Effect Multis"
        keys={WorldEffectValues}
        values={localConfig.world_multi ?? defaultConfig.world_multi}
        onChange={updateMultiplier('world_multi')}
      />

      <div className="flex gap-2">
        <Button variant='outline' onClick={resetConfig}>Reset</Button>
      </div>
    </div>
  );
}
