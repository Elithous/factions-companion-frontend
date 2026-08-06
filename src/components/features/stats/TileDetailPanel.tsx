'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type {
  TileDetail,
  TileFaction,
  TileLootSummary,
  TileOwnershipSummary,
  TilePlayerEntry,
} from '@/types/stats';

import './tileDetail.scss';

export interface TileDetailPanelProps {
  detail: TileDetail | null;
  isLoading: boolean;
  /** Shown inline rather than replacing the page — the rest of the stats still work. */
  error?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

/** Backend timestamps are unix *seconds*, not milliseconds. */
const toDate = (seconds: number) => new Date(seconds * 1000);

const formatTime = (seconds: number | null) =>
  seconds ? toDate(seconds).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : '—';

/** `2d 4h`, `4h 12m`, `12m 30s` — always at most the two largest units. */
function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds < 1) return '—';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const formatNumber = (value: number) => value.toLocaleString();

/** Turns `fortification_workers_sent` into `Fortification`. */
const prettifyActivityType = (type: string) =>
  type
    .replace(/_workers_sent$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const prettifyName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

/* -------------------------------------------------------------------------- */
/* Small shared pieces                                                        */
/* -------------------------------------------------------------------------- */

function FactionChip({ faction }: { faction: TileFaction | null }) {
  const value = faction ?? 'UNOWNED';
  return <span className={`faction-chip ${value}`}>{value}</span>;
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-chip">
      <span className="stat-chip-value">{typeof value === 'number' ? formatNumber(value) : value}</span>
      <span className="stat-chip-label">{label}</span>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return <p className="empty-section">{message}</p>;
}

/* -------------------------------------------------------------------------- */
/* Ownership                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A proportional bar of the tile's ownership history.
 *
 * Very short segments would otherwise vanish entirely, so each one is floored at
 * a hairline width — the bar is for reading the shape of the fight, and the
 * table below it carries the exact numbers.
 */
function OwnershipTimeline({ ownership }: { ownership: TileOwnershipSummary }) {
  const total = ownership.trackedSeconds;
  if (!total || !ownership.segments.length) return null;

  return (
    <div className="ownership-timeline">
      {ownership.segments.map((segment, index) => (
        <SimpleTooltip
          key={`${segment.startTime}-${index}`}
          label={`${segment.faction}${segment.player ? ` (${segment.player})` : ''} — ${formatDuration(segment.seconds)}`}
        >
          <div
            className={`timeline-segment ${segment.faction}`}
            style={{ flexGrow: Math.max(segment.seconds / total, 0.004) }}
          />
        </SimpleTooltip>
      ))}
    </div>
  );
}

function OwnershipTab({ ownership }: { ownership: TileOwnershipSummary }) {
  if (!ownership.segments.length) {
    return <EmptySection message="No ownership history available for this tile." />;
  }

  return (
    <div className="tab-body">
      <div className="stat-chip-row">
        <StatChip label="Tracked" value={formatDuration(ownership.trackedSeconds)} />
        <StatChip label="Captures" value={ownership.totalCaptures} />
        {/* Changes without an attributable capturer — resets to neutral, say —
            would otherwise look like missing captures. */}
        {ownership.totalChanges !== ownership.totalCaptures && (
          <StatChip label="Owner changes" value={ownership.totalChanges} />
        )}
        <StatChip label="Started as" value={ownership.startingFaction} />
        <StatChip label="Current holder" value={ownership.currentFaction ?? 'Unowned'} />
        {ownership.currentPlayer && <StatChip label="Held by" value={ownership.currentPlayer} />}
      </div>

      <OwnershipTimeline ownership={ownership} />

      <Table className="detail-table">
        <TableHeader>
          <TableRow>
            <TableHead>Faction</TableHead>
            <TableHead>Time held</TableHead>
            <TableHead>Share</TableHead>
            <TableHead>Captures</TableHead>
            <TableHead>Longest hold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ownership.byFaction.map(entry => (
            <TableRow key={entry.faction}>
              <TableCell><FactionChip faction={entry.faction} /></TableCell>
              <TableCell>{formatDuration(entry.seconds)}</TableCell>
              <TableCell className="share-cell">
                <div className={`share-fill ${entry.faction}`} style={{ width: `${entry.percent}%` }} />
                <span className="share-value">{entry.percent}%</span>
              </TableCell>
              <TableCell>{formatNumber(entry.captures)}</TableCell>
              <TableCell>{formatDuration(entry.longestHoldSeconds)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <details className="segment-details">
        <summary>Every ownership change ({ownership.segments.length})</summary>
        <div className="scroll-region">
          <Table className="detail-table">
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Taken from</TableHead>
                <TableHead>Captured by</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Held</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownership.segments.map((segment, index) => (
                <TableRow key={`${segment.startTime}-${index}`}>
                  <TableCell><FactionChip faction={segment.faction} /></TableCell>
                  <TableCell>
                    {segment.capturedFrom ? <FactionChip faction={segment.capturedFrom} /> : '—'}
                  </TableCell>
                  <TableCell>{segment.capturedBy ?? '—'}</TableCell>
                  <TableCell>{formatTime(segment.startTime)}</TableCell>
                  <TableCell>{formatDuration(segment.seconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>

      <p className="section-note">
        Owner changes are read from each activity&apos;s recorded tile owner, so a
        capture is dated to the moment the tile actually changed hands. The timeline
        runs from the first activity of the game
        {ownership.dateFiltered ? ', clipped to the selected date range' : ''}, so time before
        anyone touched this tile is credited to its starting owner
        {ownership.terrain ? ` (${prettifyName(ownership.terrain)} terrain)` : ''}. Player and
        faction filters don&apos;t narrow this section — a hold time only means anything against
        an unbroken timeline.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loot (HQ tiles)                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Shown instead of Ownership on HQ tiles. An HQ never changes hands, so the
 * interesting question there is who looted it and for how much.
 */
function LootTab({ loot }: { loot: TileLootSummary }) {
  if (!loot.totalLoots) {
    return (
      <EmptySection
        message={`This is the ${loot.hqFaction} HQ. It was never looted under the current filters.`}
      />
    );
  }

  return (
    <div className="tab-body">
      <div className="stat-chip-row">
        <StatChip label="HQ faction" value={loot.hqFaction} />
        <StatChip label="VP taken" value={loot.totalVp} />
        <StatChip label="Loots" value={loot.totalLoots} />
        <StatChip label="First loot" value={formatTime(loot.firstLoot)} />
        <StatChip label="Last loot" value={formatTime(loot.lastLoot)} />
      </div>

      <Table className="detail-table">
        <TableHeader>
          <TableRow>
            <TableHead>Looting faction</TableHead>
            <TableHead>VP taken</TableHead>
            <TableHead>Loots</TableHead>
            <TableHead>Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loot.byFaction.map(entry => (
            <TableRow key={entry.faction}>
              <TableCell><FactionChip faction={entry.faction} /></TableCell>
              <TableCell className="share-cell">
                <div
                  className={`share-fill ${entry.faction}`}
                  style={{ width: loot.totalVp ? `${(entry.vp / loot.totalVp) * 100}%` : '0%' }}
                />
                <span className="share-value">{formatNumber(entry.vp)}</span>
              </TableCell>
              <TableCell>{formatNumber(entry.loots)}</TableCell>
              <TableCell>{formatNumber(entry.players)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="scroll-region">
        <Table className="detail-table">
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Faction</TableHead>
              <TableHead>VP taken</TableHead>
              <TableHead>Loots</TableHead>
              <TableHead>First</TableHead>
              <TableHead>Last</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loot.byPlayer.map(entry => (
              <TableRow key={entry.player}>
                <TableCell className="player-cell">{entry.player}</TableCell>
                <TableCell><FactionChip faction={entry.faction} /></TableCell>
                <TableCell>{formatNumber(entry.vp)}</TableCell>
                <TableCell>{formatNumber(entry.loots)}</TableCell>
                <TableCell>{formatTime(entry.firstLoot)}</TableCell>
                <TableCell>{formatTime(entry.lastLoot)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Players                                                                    */
/* -------------------------------------------------------------------------- */

function PlayersTab({ players }: { players: TilePlayerEntry[] }) {
  if (!players.length) {
    return <EmptySection message="No player activity on this tile for the current filters." />;
  }

  const maxSoldiers = Math.max(...players.map(player => player.soldiersTotal), 0);

  return (
    <div className="tab-body">
      <div className="scroll-region">
        <Table className="detail-table">
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Faction</TableHead>
              <TableHead>Soldiers</TableHead>
              <TableHead>Attack</TableHead>
              <TableHead>Defend</TableHead>
              <TableHead>Captures</TableHead>
              <TableHead>Support</TableHead>
              <TableHead>Workers</TableHead>
              <TableHead>Last action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map(player => (
              <TableRow key={player.player}>
                <TableCell className="player-cell">{player.player}</TableCell>
                <TableCell><FactionChip faction={player.faction} /></TableCell>
                <TableCell className="share-cell">
                  <div
                    className={`share-fill ${player.faction}`}
                    style={{ width: maxSoldiers ? `${(player.soldiersTotal / maxSoldiers) * 100}%` : '0%' }}
                  />
                  <span className="share-value">{formatNumber(player.soldiersTotal)}</span>
                </TableCell>
                <TableCell>
                  {formatNumber(player.soldiersAttack)}
                  <span className="sub-value"> / {player.attacks}</span>
                </TableCell>
                <TableCell>
                  {formatNumber(player.soldiersDefend)}
                  <span className="sub-value"> / {player.defends}</span>
                </TableCell>
                <TableCell>{formatNumber(player.captures)}</TableCell>
                <TableCell>{formatNumber(player.supportSent)}</TableCell>
                <TableCell>{formatNumber(player.workersSent)}</TableCell>
                <TableCell>{formatTime(player.lastAction)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="section-note">
        Attack and defend columns show soldiers sent, then the number of separate sends.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Support                                                                    */
/* -------------------------------------------------------------------------- */

function SupportTab({ support }: { support: TileDetail['support'] }) {
  if (!support.totalEvents) {
    return <EmptySection message="No support units were sent to this tile." />;
  }

  return (
    <div className="tab-body">
      <div className="stat-chip-row">
        <StatChip label="Support sends" value={support.totalEvents} />
        <StatChip label="Units" value={support.totalUnits} />
        <StatChip label="Kills" value={support.totalKills} />
      </div>

      <Table className="detail-table">
        <TableHeader>
          <TableRow>
            <TableHead>Support type</TableHead>
            <TableHead>Faction</TableHead>
            <TableHead>Sends</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Kills</TableHead>
            <TableHead>Power</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {support.byType.map(entry => (
            <TableRow key={`${entry.supportType}-${entry.faction}`}>
              <TableCell>{prettifyName(entry.supportType)}</TableCell>
              <TableCell><FactionChip faction={entry.faction} /></TableCell>
              <TableCell>{formatNumber(entry.count)}</TableCell>
              <TableCell>{formatNumber(entry.units)}</TableCell>
              <TableCell>{formatNumber(entry.kills)}</TableCell>
              <TableCell>{entry.power ? entry.power.toFixed(2) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <details className="segment-details">
        <summary>By player ({support.byPlayer.length})</summary>
        <div className="scroll-region">
          <Table className="detail-table">
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Faction</TableHead>
                <TableHead>Sends</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Kills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {support.byPlayer.map(entry => (
                <TableRow key={entry.player}>
                  <TableCell className="player-cell">{entry.player}</TableCell>
                  <TableCell><FactionChip faction={entry.faction} /></TableCell>
                  <TableCell>{formatNumber(entry.count)}</TableCell>
                  <TableCell>{formatNumber(entry.units)}</TableCell>
                  <TableCell>{formatNumber(entry.kills)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Building kills                                                             */
/* -------------------------------------------------------------------------- */

function BuildingsTab({ buildingKills }: { buildingKills: TileDetail['buildingKills'] }) {
  if (!buildingKills.totalActivations) {
    return <EmptySection message="No buildings fired on this tile." />;
  }

  return (
    <div className="tab-body">
      <div className="stat-chip-row">
        <StatChip label="Activations" value={buildingKills.totalActivations} />
        <StatChip label="Soldiers destroyed" value={buildingKills.totalSoldiersDestroyed} />
      </div>

      <div className="scroll-region">
        <Table className="detail-table">
          <TableHeader>
            <TableRow>
              <TableHead>Source building</TableHead>
              <TableHead>From tile</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Faction</TableHead>
              <TableHead>Activations</TableHead>
              <TableHead>Soldiers destroyed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildingKills.sources.map(source => (
              <TableRow key={`${source.x}-${source.y}-${source.building}-${source.faction}`}>
                <TableCell>{prettifyName(source.building)}</TableCell>
                <TableCell>
                  {source.x !== null && source.y !== null ? `(${source.x}, ${source.y})` : 'Unknown'}
                </TableCell>
                <TableCell>{source.distance !== null ? source.distance : '—'}</TableCell>
                <TableCell><FactionChip faction={source.faction} /></TableCell>
                <TableCell>{formatNumber(source.activations)}</TableCell>
                <TableCell>{formatNumber(source.soldiersDestroyed)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {buildingKills.unknownSourceCount > 0 && (
        <p className="section-note warning">
          {formatNumber(buildingKills.unknownSourceCount)} activation
          {buildingKills.unknownSourceCount === 1 ? '' : 's'} didn&apos;t record the firing
          building&apos;s coordinates, so they&apos;re grouped under &ldquo;Unknown&rdquo;. They
          still count towards the totals above.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Workers                                                                    */
/* -------------------------------------------------------------------------- */

function WorkersTab({ workers }: { workers: TileDetail['workers'] }) {
  if (!workers.totalEvents) {
    return <EmptySection message="No workers were sent to this tile." />;
  }

  return (
    <div className="tab-body">
      <div className="stat-chip-row">
        <StatChip label="Total workers" value={workers.totalWorkers} />
        <StatChip label="Fortification" value={workers.fortificationWorkers} />
        <StatChip label="Improvement" value={workers.improvementWorkers} />
        <StatChip label="Dismantle" value={workers.dismantleWorkers} />
      </div>

      <Table className="detail-table">
        <TableHeader>
          <TableRow>
            <TableHead>Kind</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Sends</TableHead>
            <TableHead>Workers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.byProject.map(entry => (
            <TableRow key={`${entry.activityType}-${entry.projectType}`}>
              <TableCell>{prettifyActivityType(entry.activityType)}</TableCell>
              <TableCell>{prettifyName(entry.projectType)}</TableCell>
              <TableCell>{formatNumber(entry.events)}</TableCell>
              <TableCell>{formatNumber(entry.workers)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <details className="segment-details">
        <summary>By player ({workers.byPlayer.length})</summary>
        <div className="scroll-region">
          <Table className="detail-table">
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Faction</TableHead>
                <TableHead>Sends</TableHead>
                <TableHead>Workers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.byPlayer.map(entry => (
                <TableRow key={entry.player}>
                  <TableCell className="player-cell">{entry.player}</TableCell>
                  <TableCell><FactionChip faction={entry.faction} /></TableCell>
                  <TableCell>{formatNumber(entry.events)}</TableCell>
                  <TableCell>{formatNumber(entry.workers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The drill-down that appears once a tile is selected on the map.
 *
 * Renders nothing at all when there's no selection, so the stats page can drop
 * it in unconditionally.
 */
export default function TileDetailPanel({ detail, isLoading, error }: TileDetailPanelProps) {
  if (!detail && !isLoading && !error) return null;

  return (
    <Card className="tile-detail-panel p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-medium">
          Tile Details{detail ? ` — (${detail.tile.x}, ${detail.tile.y})` : ''}
        </p>
        {detail && (
          <div className="flex flex-wrap items-center gap-2">
            {detail.loot && (
              <Badge variant="outline">{detail.loot.hqFaction} HQ</Badge>
            )}
            {detail.terrain && <Badge variant="outline">{prettifyName(detail.terrain)}</Badge>}
            <Badge variant="outline">{formatNumber(detail.activityCount)} activities</Badge>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="tile-detail-loading">
          <Spinner size={32} />
        </div>
      )}

      {error && !isLoading && <p className="section-note warning">{error}</p>}

      {detail && !isLoading && (
        // HQ tiles can't be captured, so they get a Loot tab where the Ownership
        // tab would otherwise sit.
        <Tabs defaultValue={detail.loot ? 'loot' : 'ownership'} className="tile-detail-tabs">
          <TabsList className="tile-detail-tabs-list">
            {detail.loot
              ? <TabsTrigger value="loot">Loot</TabsTrigger>
              : <TabsTrigger value="ownership">Ownership</TabsTrigger>}
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="workers">Workers</TabsTrigger>
          </TabsList>

          {detail.loot && (
            <TabsContent value="loot"><LootTab loot={detail.loot} /></TabsContent>
          )}
          {detail.ownership && (
            <TabsContent value="ownership"><OwnershipTab ownership={detail.ownership} /></TabsContent>
          )}
          <TabsContent value="players"><PlayersTab players={detail.players} /></TabsContent>
          <TabsContent value="support"><SupportTab support={detail.support} /></TabsContent>
          <TabsContent value="buildings"><BuildingsTab buildingKills={detail.buildingKills} /></TabsContent>
          <TabsContent value="workers"><WorkersTab workers={detail.workers} /></TabsContent>
        </Tabs>
      )}
    </Card>
  );
}
