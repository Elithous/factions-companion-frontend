"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';

import GameSelect from '@/components/features/game/GameSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { getActivePlayerOptions, getPlayerStats } from '@/lib/api/reports';
import type { PlayerStats } from '@/types/player';

import BuildTimeline from './_components/BuildTimeline';
import BuildingGroupCard from './_components/BuildingGroupCard';
import PlayerGameStats from './_components/PlayerGameStats';
import PlayerHeatmap from './_components/PlayerHeatmap';
import ProjectTree from './_components/ProjectTree';
import VillageCard from './_components/VillageCard';
import { usePlayerGameStats } from './_hooks/usePlayerGameStats';
import { useVillageTimeline } from './_hooks/useVillageTimeline';
import './playerStats.scss';

const HIDE_BUILD_MESSAGE =
  "If you would like your build to be hidden on this screen, message BurnedAether on Discord and I'll hide it.";

export default function PlayerStatsPage() {
  const router = useRouter();
  const path = usePathname();
  const queryParams = useSearchParams();

  const [gameId, setGameId] = useState(queryParams.get('gameId') || '');
  const [playerName, setPlayerName] = useState<string | null>(queryParams.get('playerName') || null);
  const [playerList, setPlayerList] = useState<ComboboxOption[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  // Top-level tabs: Overview (career totals, TBD) / Game Log (current functionality).
  // Defaulting to "gamelog" since that's the only tab with real data for now —
  // flip to "overview" once that tab has content worth landing on.
  const [activeTab, setActiveTab] = useState('gamelog');
  const [activeSubTab, setActiveSubTab] = useState('village');
  const [timelineStep, setTimelineStep] = useState(0);

  const showTimeline = activeTab === 'gamelog' && activeSubTab === 'village';

  const { villageStats, buildingGroups } = useVillageTimeline(playerStats, timelineStep);
  const { filter: playerFilter, overview: gameOverview, filtered: filteredGameStats } =
    usePlayerGameStats(gameId, playerName);

  useEffect(() => {
    if (!gameId) {
      setPlayerList([]);
      return;
    }

    getActivePlayerOptions(gameId)
      .then(setPlayerList)
      .catch(error => {
        console.error('Error fetching players:', error);
        setPlayerList([]);
      });
  }, [gameId]);

  useEffect(() => {
    if (!playerName) {
      setPlayerStats(null);
      return;
    }

    getPlayerStats(gameId, playerName)
      .then(setPlayerStats)
      .catch(error => {
        setPlayerStats(null);
        console.error('Error fetching player stats:', error);
      });
    // gameId is intentionally omitted: changing it clears playerName first.
  }, [playerName]);

  // Jump to the end of the build history whenever a new player loads.
  useEffect(() => {
    setTimelineStep((playerStats?.buildActivities.length || 1) - 1);
  }, [playerStats]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (gameId) params.set('gameId', gameId);
    if (playerName) params.set('playerName', playerName);
    router.replace(`${path}?${params.toString()}`);
  }, [gameId, playerName, path, router]);

  return (
    <>
      <div
        className="mx-auto max-w-7xl px-4 py-8"
        style={{ marginBottom: showTimeline ? '60px' : undefined }}
      >
        <div className="player-activities-stack flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <p className="text-xl font-bold">Player Activities</p>
            <SimpleTooltip label={HIDE_BUILD_MESSAGE}>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Info size={20} />
              </Button>
            </SimpleTooltip>
          </div>

          <Card className="selectors-section p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px] max-w-[300px] flex-auto">
                <GameSelect gameId={gameId} setGameId={setGameId} />
              </div>
              <div className="flex min-w-[200px] max-w-[300px] flex-auto flex-col gap-1">
                <Label>Player Name</Label>
                <Combobox
                  value={playerName}
                  onChange={setPlayerName}
                  options={playerList}
                  placeholder="Select player..."
                  searchPlaceholder="Search players..."
                  disabled={!gameId}
                />
              </div>
            </div>
          </Card>

          {/* Top-level tabs, per the player-stats-page.html redesign template.
              Game Log's sub-tabs are wired to existing report endpoints,
              scoped to the selected player. Overview (career totals across
              all games) has no existing endpoint to build on yet. */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="gamelog">Game Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="p-8">
                <p className="text-center text-muted-foreground">Overview — coming soon...</p>
              </Card>
            </TabsContent>

            <TabsContent value="gamelog">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList>
                  <TabsTrigger value="village">Village</TabsTrigger>
                  <TabsTrigger value="project-tree">Project Tree</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="game-stats">Game Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="village">
                  <div className="flex flex-col gap-4">
                    <VillageCard villageStats={villageStats} />

                    <div className="flex flex-col gap-4">
                      {buildingGroups.map(group => (
                        <BuildingGroupCard key={group.name} buildingGroup={group} />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="project-tree">
                  <ProjectTree
                    hasPlayer={!!playerName}
                    personalActivities={playerStats?.personalActivities ?? []}
                  />
                </TabsContent>

                <TabsContent value="heatmap">
                  <PlayerHeatmap
                    hasPlayer={!!playerName}
                    isLoading={filteredGameStats.isLoading}
                    mapConfig={gameOverview.mapConfig}
                    mapImage={gameOverview.mapImage}
                    mapTiles={filteredGameStats.mapTiles}
                  />
                </TabsContent>

                <TabsContent value="game-stats">
                  <PlayerGameStats
                    hasPlayer={!!playerName}
                    isLoading={filteredGameStats.isLoading}
                    error={filteredGameStats.error ?? gameOverview.error}
                    filter={playerFilter}
                    total={gameOverview.totalData}
                    filteredData={filteredGameStats.filteredData}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showTimeline && (
        <BuildTimeline
          timelineSteps={playerStats?.buildActivities}
          currentStep={timelineStep}
          onStepChange={setTimelineStep}
        />
      )}
    </>
  );
}
