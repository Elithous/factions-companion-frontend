'use client';

import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, FileDown, FileUp, Shrink } from "lucide-react";

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Building, ResourceCost, ScalingTypes } from '@/lib/game';

import BuildTips from './_components/BuildTips';
import BuildingsPanel from './_components/BuildingsPanel';
import CalculatorConfig from './_components/CalculatorConfig';
import CostSummary from './_components/CostSummary';
import { ExportDialog, ImportDialog } from './_components/ImportExportDialogs';
import OutputTable from './_components/OutputTable';
import { useBuildPlan } from './_hooks/useBuildPlan';
import { useBuildRequirements } from './_hooks/useBuildRequirements';
import './calculator.scss';

const NO_RESOURCES: ResourceCost = { wood: 0, iron: 0, worker: 0 };

/** One side of the current/goal comparison, with its condense control. */
function BuildColumn({
  title,
  buildings,
  setBuildings,
  hq,
  setHq,
  onCondense,
}: {
  title: string;
  buildings: Building[];
  setBuildings: (buildings: Building[]) => void;
  hq: number;
  setHq: (hq: number) => void;
  onCondense: () => void;
}) {
  return (
    <div style={{ flexGrow: '1' }}>
      <div className="flex items-center justify-between">
        <p className='title'>{title}</p>
        <SimpleTooltip label="Combine buildings of the same type and level">
          <Button size="sm" onClick={onCondense}>
            <Shrink size={14} />
            Condense
          </Button>
        </SimpleTooltip>
      </div>
      <BuildingsPanel buildings={buildings} setBuildings={setBuildings} hq={hq} setHq={setHq} />
    </div>
  );
}

export default function CalculatorPage() {
  const { plan, update, config, setConfig, copyBuild, condense, toExportData, applyImport } = useBuildPlan();

  const [currentResources, setCurrentResources] = useState<ResourceCost>(NO_RESOURCES);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState('');

  const requirements = useBuildRequirements(plan, config, currentResources);

  const setResource = useCallback((resource: ScalingTypes, value: number) => {
    setCurrentResources(prev => ({ ...prev, [resource]: value }));
  }, []);

  const setCurrentBuild = useCallback((currentBuild: Building[]) => update({ currentBuild }), [update]);
  const setGoalBuild = useCallback((goalBuild: Building[]) => update({ goalBuild }), [update]);
  const setCurrentHq = useCallback((currentHq: number) => update({ currentHq }), [update]);
  const setGoalHq = useCallback((goalHq: number) => update({ goalHq }), [update]);

  const handleExport = useCallback(() => {
    const text = JSON.stringify(toExportData(), null, 2);
    setExportText(text);
    navigator.clipboard.writeText(text).catch(console.error);
    setExportOpen(true);
  }, [toExportData]);

  return (
    <div className="calculator-container">
      <div className="calculator-header">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button>Change Config</Button>
            </PopoverTrigger>
            <PopoverContent className="config-popover w-auto max-h-[80vh] overflow-y-auto">
              <CalculatorConfig config={config} setConfig={setConfig} />
            </PopoverContent>
          </Popover>
          <Button onClick={() => setImportOpen(true)}>
            <FileUp size={16} />
            Import
          </Button>
          <Button onClick={handleExport}>
            <FileDown size={16} />
            Export
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <BuildColumn
          title="Current"
          buildings={plan.currentBuild}
          setBuildings={setCurrentBuild}
          hq={plan.currentHq}
          setHq={setCurrentHq}
          onCondense={() => condense('current')}
        />

        <div className="controls flex flex-col justify-center gap-4">
          <Button aria-label="Copy current build to goal" onClick={() => copyBuild('forward')}>
            <ArrowRight size={16} />
          </Button>
          <Button aria-label="Copy goal build to current" onClick={() => copyBuild('backward')}>
            <ArrowLeft size={16} />
          </Button>
        </div>

        <BuildColumn
          title="Goal"
          buildings={plan.goalBuild}
          setBuildings={setGoalBuild}
          hq={plan.goalHq}
          setHq={setGoalHq}
          onCondense={() => condense('goal')}
        />
      </div>

      <p className='title'>Totals</p>
      <div className="flex flex-wrap gap-4">
        <OutputTable title="Current Output" buildings={plan.currentBuild} config={config} />
        <OutputTable title="Goal Output" buildings={plan.goalBuild} config={config} />
      </div>

      <CostSummary
        requirements={requirements}
        currentResources={currentResources}
        setResource={setResource}
      />

      <BuildTips plan={plan} currentResources={currentResources} config={config} />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={applyImport} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} value={exportText} />
    </div>
  );
}
