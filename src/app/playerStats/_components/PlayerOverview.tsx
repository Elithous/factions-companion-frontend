import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { CareerTotalKey, PlayerProfile, StatSummary } from '@/types/player';

export interface PlayerOverviewProps {
  profile: PlayerProfile | null;
  isLoading?: boolean;
}

/** Rows of the career totals table. Nested rows break down the one above. */
const TOTAL_ROWS: { key: CareerTotalKey; label: string; nested?: boolean }[] = [
  { key: 'soldiers', label: 'Soldiers' },
  { key: 'workers', label: 'Workers' },
  { key: 'resources', label: 'Resources' },
  { key: 'wood', label: 'Wood', nested: true },
  { key: 'iron', label: 'Iron', nested: true },
  { key: 'supports', label: 'Supports' },
  { key: 'knight', label: 'Knight', nested: true },
  { key: 'guardian', label: 'Guardian', nested: true },
  { key: 'mapBuildings', label: 'Map Buildings' },
];

/** Faction colours in the order the game lists them. */
const FACTIONS = ['RED', 'GREEN', 'BLUE', 'YELLOW'] as const;

/**
 * Rows whose averages skip games where that support wasn't sent, mapped to what
 * the row counts. Each is filtered on its own column, so a knight-only game
 * doesn't count as a zero-guardian game.
 */
const SUPPORT_ROWS: Partial<Record<CareerTotalKey, string>> = {
  supports: 'supports',
  knight: 'knights',
  guardian: 'guardians',
};

const whole = (value: number) => Math.round(value).toLocaleString();

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="overview-stat">
      <span className="overview-stat-label">{label}</span>
      <span className="overview-stat-value">{value}</span>
    </div>
  );
}

function TotalsRow({ label, nested, summary, sentLabel }: {
  label: string;
  nested?: boolean;
  summary: StatSummary | undefined;
  /** What this row counts, when it only counts games that sent some. */
  sentLabel?: string;
}) {
  const games = summary?.countedGames ?? 0;
  const noun = games === 1 ? 'game' : 'games';
  const averageNote = sentLabel
    ? `Across the ${games} ${noun} where ${sentLabel} were sent`
    : `Across ${games} ${noun}`;

  return (
    <tr className={nested ? 'nested' : undefined}>
      <th scope="row">{label}</th>
      <td>{summary ? whole(summary.total) : '—'}</td>
      <td>
        {summary ? (
          <SimpleTooltip label={averageNote}>
            <span>{whole(summary.average)}</span>
          </SimpleTooltip>
        ) : '—'}
      </td>
    </tr>
  );
}

/** Career-wide summary for a player, across every game they appear in. */
export default function PlayerOverview({ profile, isLoading = false }: PlayerOverviewProps) {
  if (isLoading && !profile) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Spinner size={28} />
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">No profile available for this player.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overview-summary">
        <div className="overview-stat-row">
          <Stat label="Games" value={profile.gamesPlayed} />
          <Stat label="Wins" value={profile.gamesWon} />
          <Stat label="MVPs" value={profile.mvps} />
        </div>

        {/* Faction counts come from our own activity log, so they only cover
            games we hold data for — which is why they can total less than
            Games above. */}
        <div className="overview-stat-row">
          {FACTIONS.map(faction => (
            <Stat
              key={faction}
              label={faction.charAt(0) + faction.slice(1).toLowerCase()}
              value={profile.factionCounts[faction] ?? 0}
            />
          ))}
        </div>
      </Card>

      <Card className="overview-totals">
        <table className="overview-totals-table">
          <thead>
            <tr>
              <th />
              <th>Total</th>
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            {TOTAL_ROWS.map(row => (
              <TotalsRow
                key={row.key}
                label={row.label}
                nested={row.nested}
                summary={profile.totals[row.key]}
                sentLabel={SUPPORT_ROWS[row.key]}
              />
            ))}
          </tbody>
        </table>

        <p className="overview-note">
          Averages are per game, across the games loaded in. Each support row skips
          games where that support wasn&apos;t sent, so it reflects what the player does
          when they use it rather than counting those games as zero.
        </p>
      </Card>
    </div>
  );
}
