import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { PlayerProfile } from '@/types/player';

export interface PlayerHeaderProps {
  profile: PlayerProfile | null;
  /** Shown while the profile loads, so the card isn't blank. */
  playerId: number | null;
  fallbackName?: string | null;
  isLoading?: boolean;
  onRefresh: () => void;
}

function formatLastSeen(timestampSeconds: number | null) {
  if (!timestampSeconds) return 'Unknown';

  return new Date(timestampSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Identity card shown above the tabs, on both Overview and Games.
 *
 * The id sits next to the name because names aren't stable — it's what every
 * link and report keys on, so it's worth showing rather than hiding.
 */
export default function PlayerHeader({
  profile,
  playerId,
  fallbackName,
  isLoading = false,
  onRefresh,
}: PlayerHeaderProps) {
  if (playerId === null) return null;

  const name = profile?.name ?? fallbackName ?? `Player ${playerId}`;
  // The upstream list includes the current name, so it's dropped from aliases.
  const aliases = (profile?.names ?? []).filter(alias => alias !== name);

  return (
    <Card className="player-header">
      <div className="player-header-avatar">
        {profile?.avatarUrl ? (
          <Image src={profile.avatarUrl} alt="" width={64} height={64} unoptimized />
        ) : (
          <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="player-header-body">
        <div className="player-header-identity">
          <span className="player-header-name">{name}</span>
          <span className="player-header-id">:{playerId}</span>

          {aliases.length > 0 && (
            <SimpleTooltip label={`Also known as ${aliases.join(', ')}`}>
              <span className="player-header-aliases">
                {aliases.length} {aliases.length === 1 ? 'alias' : 'aliases'}
              </span>
            </SimpleTooltip>
          )}

          {profile?.clan && (
            <SimpleTooltip label={profile.clan.tagline || profile.clan.name}>
              <span className="player-header-clan">{profile.clan.name}</span>
            </SimpleTooltip>
          )}
        </div>

        <div className="player-header-score">
          {profile?.score !== null && profile?.score !== undefined
            ? <><strong>{Math.round(profile.score)}</strong> MMR</>
            : <span className="opacity-60">MMR unavailable</span>}
        </div>

        <div className="player-header-meta">
          <span>Last seen: {formatLastSeen(profile?.lastSeen ?? null)}</span>

          <Button size="sm" variant="outline" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? <Spinner size={14} /> : 'Update'}
          </Button>

          {profile?.upstreamUnavailable && (
            <SimpleTooltip label="The game's player API couldn't be reached, so rating and record are missing. Contribution totals are still from local data.">
              <span className="player-header-warning">Partial data</span>
            </SimpleTooltip>
          )}
        </div>
      </div>
    </Card>
  );
}
