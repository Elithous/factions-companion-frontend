'use client';

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import GameSelect from "@/components/features/game/GameSelect";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SimpleTable, SimpleTableData } from "@/components/ui/simple-table";
import { getGameConfig } from "@/lib/api/reports";
import {
  ApiGameConfig,
  BASE_COST_MULTI,
  BuildingNameType,
  configFromApi,
  getBuildingCost,
  getHqCost,
  toBuildingOptions,
} from "@/lib/game";
import { useBuildingCatalogue } from "@/hooks/useBuildingCatalogue";

const COST_TABLE_HEAD = ['Level', 'Wood', 'Iron', 'Worker'];

/** Effective per-level cost multipliers, as reported by the backend. */
function buildParamTable(apiConfig: ApiGameConfig | undefined): SimpleTableData {
  const params = apiConfig?.misc?.parameters;
  const scale = (multiplier: number | undefined) =>
    multiplier === undefined ? BASE_COST_MULTI : (multiplier * BASE_COST_MULTI).toFixed(4);

  return {
    head: ['Type', 'Wood', 'Iron', 'Worker'],
    body: [
      ['HQ', scale(params?.hq_wood_cost_multiplier), scale(params?.hq_iron_cost_multiplier), scale(params?.hq_worker_cost_multiplier)],
      ['Building', scale(params?.building_wood_cost_multiplier), scale(params?.building_iron_cost_multiplier), scale(params?.building_worker_cost_multiplier)],
    ],
  };
}

/** Reference tables for HQ and per-building level costs in a given game. */
export default function ConfigPage() {
  const queryParams = useSearchParams();

  const [gameId, setGameId] = useState(queryParams.get('gameId') || '');
  const [apiConfig, setApiConfig] = useState<ApiGameConfig>();
  const [type, setType] = useState<BuildingNameType | null>(null);
  const [maxLevel, setMaxLevel] = useState(15);

  // Buildings and their costs are game-specific, so the catalogue follows the
  // selected game. With none picked the backend serves the newest game's.
  const { catalogue } = useBuildingCatalogue(gameId);

  useEffect(() => {
    if (!gameId) return;

    setApiConfig(undefined);
    getGameConfig(gameId)
      .then(setApiConfig)
      .catch(error => console.error('Error loading game config:', error));
  }, [gameId]);

  const gameConfig = useMemo(() => configFromApi(apiConfig), [apiConfig]);
  const paramTable = useMemo(() => buildParamTable(apiConfig), [apiConfig]);
  const levels = useMemo(
    () => Array.from({ length: maxLevel }, (_, index) => index + 1),
    [maxLevel],
  );

  const hqCostTable: SimpleTableData = useMemo(() => ({
    head: COST_TABLE_HEAD,
    body: levels.map(level => {
      const cost = getHqCost(catalogue, level, gameConfig);
      return [level, cost.wood, cost.iron, cost.worker];
    }),
  }), [catalogue, levels, gameConfig]);

  const costTable: SimpleTableData = useMemo(() => ({
    head: COST_TABLE_HEAD,
    body: type
      ? levels.map(level => {
          const cost = getBuildingCost(catalogue, type, level, gameConfig);
          return [level, cost.wood, cost.iron, cost.worker];
        })
      : [],
  }), [catalogue, levels, type, gameConfig]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <GameSelect gameId={gameId} setGameId={setGameId} />

      <div className="mt-4 flex flex-wrap gap-8">
        <SimpleTable data={paramTable} className="w-full max-w-md" />

        <div className="costs w-full">
          <div className="flex flex-wrap items-end gap-8">
            <p className="w-[230px] text-center">HQ</p>
            <NumberInput className="w-[70px]" label='Count' value={maxLevel} onChange={setMaxLevel} min={5} />
            <div className="flex flex-col gap-1">
              <Label>Building</Label>
              <Combobox
                value={type}
                onChange={v => setType(v as BuildingNameType | null)}
                options={toBuildingOptions(catalogue)}
                triggerClassName="w-fit min-w-[180px]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-8">
            <SimpleTable data={hqCostTable} className="w-fit text-right" />
            <SimpleTable data={costTable} className="w-fit text-right" />
          </div>
        </div>
      </div>
    </div>
  );
}
