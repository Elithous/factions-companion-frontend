"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';

import GameSelect from '@/components/features/game/GameSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { getAllPlayers, getPlayerProfile, getPlayerStats } from '@/lib/api/reports';
import type { PlayerIdentity, PlayerProfile, PlayerStats } from '@/types/player';

import BuildTimeline from './_components/BuildTimeline';
import BuildingGroupCard from './_components/BuildingGroupCard';
import PlayerGameStats from './_components/PlayerGameStats';
import PlayerHeader from './_components/PlayerHeader';
import PlayerOverview from './_components/PlayerOverview';
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
  // Combobox values are strings; this holds the player id as one. Usernames
  // change between and within games, so the id is what gets persisted.
  const [playerKey, setPlayerKey] = useState<string | null>(queryParams.get('playerId') || null);
  // The raw identities are kept, not just the combobox options: the header and
  // overview need the aliases, game count and last-seen time.
  const [players, setPlayers] = useState<PlayerIdentity[]>([]);
  const [isPlayerListLoading, setIsPlayerListLoading] = useState(true);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const playerId = playerKey ? Number(playerKey) : null;
  const selectedPlayer = players.find(candidate => String(candidate.playerId) === playerKey) ?? null;
  const playerName = selectedPlayer?.name ?? null;

  const hasPlayer = playerId !== null;
  /** Falls back to the id until the name arrives, so labels are never blank. */
  const playerLabel = playerName ?? (playerKey ? `Player ${playerKey}` : null);
  // Top-level tabs: Overview (career totals, TBD) / Game Log (current functionality).
  // Defaulting to "gamelog" since that's the only tab with real data for now —
  // flip to "overview" once that tab has content worth landing on.
  const [activeTab, setActiveTab] = useState('gamelog');
  const [activeSubTab, setActiveSubTab] = useState('village');
  const [timelineStep, setTimelineStep] = useState(0);

  // The timeline is a fixed footer, so it must not appear before there's a
  // build history to scrub through.
  const showTimeline =
    !!playerStats && !!gameId && activeTab === 'gamelog' && activeSubTab === 'village';

  const { villageStats, buildingGroups } = useVillageTimeline(playerStats, timelineStep);
  const {
    filter: playerFilter,
    overview: gameOverview,
    filtered: filteredGameStats,
    isLoading: isGameDataLoading,
  } = usePlayerGameStats(gameId, playerId, playerName);

  // Selecting a game kicks off several requests at once, and they're slow
  // enough that without this the page looks empty rather than busy.
  const isGameLoading = !!gameId && (isStatsLoading || isGameDataLoading);

  // The player list spans every game, since a player is now chosen before a game.
  useEffect(() => {
    let cancelled = false;

    getAllPlayers()
      .then(result => !cancelled && setPlayers(result))
      .catch(error => {
        if (cancelled) return;
        console.error('Error fetching players:', error);
        setPlayers([]);
      })
      .finally(() => !cancelled && setIsPlayerListLoading(false));

    return () => { cancelled = true; };
  }, []);

  const playerList: ComboboxOption[] = useMemo(
    () => players.map(player => {
      const formerNames = player.names.slice(1);

      return {
        value: String(player.playerId),
        label: player.name,
        // Every alias is searchable, so someone who renamed is still findable by
        // the name you remember. The game count is deliberately left out — a
        // stray digit shouldn't match players by playtime.
        searchText: player.names.join(' '),
        content: (
          <span className="flex w-full items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {player.name}
              {formerNames.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  aka {formerNames.join(', ')}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {player.games} {player.games === 1 ? 'game' : 'games'}
            </span>
          </span>
        ),
      };
    }),
    [players],
  );

  const loadProfile = useCallback((refresh = false) => {
    if (playerId === null) {
      setProfile(null);
      return;
    }

    setIsProfileLoading(true);
    getPlayerProfile(playerId, refresh)
      .then(setProfile)
      .catch(error => {
        setProfile(null);
        console.error('Error fetching player profile:', error);
      })
      .finally(() => setIsProfileLoading(false));
  }, [playerId]);

  useEffect(() => {
    // Cleared first so the previous player's rating doesn't linger.
    setProfile(null);
    loadProfile();
  }, [loadProfile]);

  // Changing player invalidates the game, since the game list is theirs. Seeded
  // with the initial value so a gameId restored from the URL survives mount.
  const previousPlayer = useRef(playerKey);
  useEffect(() => {
    if (previousPlayer.current === playerKey) return;
    previousPlayer.current = playerKey;
    setGameId('');
  }, [playerKey]);

  useEffect(() => {
    if (playerId === null || !gameId) {
      setPlayerStats(null);
      setIsStatsLoading(false);
      return;
    }

    let cancelled = false;
    // Cleared up front so the previous game's village doesn't sit on screen
    // looking like data for the one just selected.
    setPlayerStats(null);
    setIsStatsLoading(true);

    getPlayerStats(gameId, playerId)
      .then(stats => !cancelled && setPlayerStats(stats))
      .catch(error => {
        if (cancelled) return;
        setPlayerStats(null);
        console.error('Error fetching player stats:', error);
      })
      .finally(() => !cancelled && setIsStatsLoading(false));

    return () => { cancelled = true; };
  }, [playerId, gameId]);

  // Jump to the end of the build history whenever a new player loads.
  useEffect(() => {
    setTimelineStep((playerStats?.buildActivities.length || 1) - 1);
  }, [playerStats]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (gameId) params.set('gameId', gameId);
    // The id, not the name: a shared link should keep working after a rename.
    if (playerKey) params.set('playerId', playerKey);
    router.replace(`${path}?${params.toString()}`);
  }, [gameId, playerKey, path, router]);

  return (
    <>
      {/* The reserved space comes from --timeline-height rather than a hardcoded
          value, so it stays in step with the bar's actual height. */}
      <div className={`mx-auto max-w-7xl px-4 py-8 ${showTimeline ? 'with-build-timeline' : ''}`}>
        <div className="player-activities-stack flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <p className="text-xl font-bold">Player Activities</p>
            <SimpleTooltip label={HIDE_BUILD_MESSAGE}>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Info size={20} />
              </Button>
            </SimpleTooltip>
          </div>

          {/* The player search sits above everything: it's the one control that
              applies to the whole page, and both tabs hang off it. */}
          <div className="player-search">
            <Label htmlFor="player-select">Player</Label>
            <Combobox
              id="player-select"
              value={playerKey}
              onChange={setPlayerKey}
              options={playerList}
              // Keeps a URL-restored player visible while the list loads,
              // instead of the trigger falling back to the placeholder.
              valueLabel={playerLabel ?? undefined}
              loading={isPlayerListLoading}
              placeholder="Select player..."
              searchPlaceholder="Search by any name they've used..."
              clearable={false}
              triggerClassName="max-w-[320px]"
            />
          </div>

          <PlayerHeader
            profile={profile}
            playerId={playerId}
            fallbackName={playerLabel}
            isLoading={isProfileLoading}
            // Update rebuilds the cached profile rather than serving it again.
            onRefresh={() => loadProfile(true)}
          />

          {!hasPlayer && (
            <Card className="p-8">
              <p className="text-center text-muted-foreground">
                Select a player to begin.
              </p>
            </Card>
          )}

          {/* Top-level tabs, per the player-stats-page.html redesign template.
              Overview is career-wide so it only needs a player; Game Log's
              sub-tabs are all scoped to one game and wait for one. */}
          {hasPlayer && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="gamelog">Games</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <PlayerOverview profile={profile} isLoading={isProfileLoading} />
            </TabsContent>

            <TabsContent value="gamelog">
              {/* The game selector belongs to this tab: Overview is career-wide
                  and has no use for it. */}
              <div className="game-search">
                <Label htmlFor="game-select">Game</Label>
                <GameSelect
                  bare
                  gameId={gameId}
                  setGameId={setGameId}
                  playerId={playerId}
                  playerName={playerName}
                />
              </div>

              {!gameId ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">
                    Select one of {playerLabel}&apos;s games for detailed stats.
                  </p>
                </Card>
              ) : (
              // Relative so the loading overlay can be scoped to the Game Log
              // panel rather than the whole page. It covers the tab strip too,
              // which is deliberate — every sub-tab reads the same in-flight
              // data, so switching between them mid-load shows nothing useful.
              <div className="gamelog-panel">
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList>
                  <TabsTrigger value="village">Village</TabsTrigger>
                  <TabsTrigger value="project-tree">Project Tree</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="game-stats">Game Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="village">
                  <div className="flex flex-col gap-4">
                    <VillageCard
                      villageStats={villageStats}
                      categories={gameOverview.buildingCategories}
                    />

                    <div className="flex flex-col gap-4">
                      {buildingGroups.map(group => (
                        <BuildingGroupCard
                          key={group.name}
                          buildingGroup={group}
                          categories={gameOverview.buildingCategories}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="project-tree">
                  <ProjectTree
                    hasPlayer={hasPlayer}
                    personalActivities={playerStats?.personalActivities ?? []}
                  />
                </TabsContent>

                <TabsContent value="heatmap">
                  <PlayerHeatmap
                    hasPlayer={hasPlayer}
                    isLoading={filteredGameStats.isLoading}
                    mapConfig={gameOverview.mapConfig}
                    mapImage={gameOverview.mapImage}
                    mapTiles={filteredGameStats.mapTiles}
                  />
                </TabsContent>

                <TabsContent value="game-stats">
                  <PlayerGameStats
                    hasPlayer={hasPlayer}
                    isLoading={filteredGameStats.isLoading}
                    error={filteredGameStats.error ?? gameOverview.error}
                    filter={playerFilter}
                    total={gameOverview.totalData}
                    filteredData={filteredGameStats.filteredData}
                  />
                </TabsContent>
              </Tabs>

              {isGameLoading && (
                <div className="gamelog-loading" role="status" aria-live="polite">
                  <Spinner size={36} />
                  <p className="gamelog-loading-text">Loading game {gameId}...</p>
                </div>
              )}
              </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>

      {showTimeline && (
        <BuildTimeline
          timelineSteps={playerStats?.buildActivities}
          currentStep={timelineStep}
          onStepChange={setTimelineStep}
          categories={gameOverview.buildingCategories}
        />
      )}
    </>
  );
}
