"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';

import { getGames } from '@/lib/api/reports';
import { Card } from '@/components/ui/card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import type { GameSummary } from '@/types/game';

import './gameSelect.scss';

interface GameSelectProps {
  gameId: string;
  setGameId: Dispatch<SetStateAction<string>>;
  /**
   * Restricts the list to games this player took part in.
   *
   * `undefined` means no filtering; `null` means the caller filters by player
   * but hasn't picked one yet.
   */
  playerId?: number | null;
  /** Latest known name for `playerId`, used only in the loading message. */
  playerName?: string | null;
  /**
   * Renders the picker bare, for callers that already provide their own card
   * and heading. Defaults to the self-contained card.
   */
  bare?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/** Upstream statuses are SCREAMING_SNAKE; these are what people actually call them. */
const STATUS_LABELS: Record<string, string> = {
  LOBBY: 'Lobby',
  IN_PROGRESS: 'In progress',
  PLAYING: 'In progress',
  COMPLETED: 'Completed',
};

const statusLabel = (status: string | null) =>
  status ? STATUS_LABELS[status] ?? titleCase(status) : null;

/** `IN_PROGRESS` / `SHORT` to `In progress` / `Short`. */
function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, char => char.toUpperCase());
}

const formatPlayers = (game: GameSummary) => {
  if (game.players === null) return null;
  return game.maxPlayers ? `${game.players}/${game.maxPlayers} players` : `${game.players} players`;
};

/**
 * The line under the game name. Unknown fields are dropped rather than shown as
 * placeholders — the upstream index doesn't list long-finished games, so older
 * entries legitimately have very little to say.
 */
function detailParts(game: GameSummary) {
  return [
    game.mode ? titleCase(game.mode) : null,
    game.map,
    formatPlayers(game),
  ].filter(Boolean) as string[];
}

function GameRow({ game }: { game: GameSummary }) {
  const details = detailParts(game);
  const status = statusLabel(game.status);

  return (
    <div className="game-option">
      <div className="game-option-head">
        <span className="game-option-name">Game {game.id}</span>
        {status && (
          <span className={`game-status ${game.status}`}>{status}</span>
        )}
      </div>

      {(details.length > 0 || game.winner) && (
        <div className="game-option-details">
          {details.join(' · ')}
          {game.winner && (
            <>
              {details.length > 0 && ' · '}
              <span className={`game-winner ${game.winner}`}>{game.winner} won</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact one-liner for the closed trigger, where there's only room for a line. */
function triggerLabel(game: GameSummary) {
  const details = detailParts(game);
  return details.length ? `Game ${game.id} — ${details.join(' · ')}` : `Game ${game.id}`;
}

/** Game picker shared by the stats, config, calculator and player pages. */
export default function GameSelect({
  gameId,
  setGameId,
  playerId,
  playerName,
  bare = false,
  disabled = false,
  placeholder = 'Choose a game',
}: GameSelectProps) {
  /**
   * The result is stored alongside the player it belongs to.
   *
   * Loading is then derived from that rather than tracked separately, which
   * closes the window where a new player has been picked but the effect hasn't
   * run yet — otherwise the previous player's games stay listed and selectable
   * for a render.
   */
  const [loaded, setLoaded] = useState<{ player: number | null | undefined; games: GameSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `playerId === null` means the caller filters by player but hasn't picked
  // one yet, so there's nothing to fetch. `undefined` means no filtering.
  const awaitingPlayer = playerId === null;
  // `loaded` must be null-checked separately rather than leaning on optional
  // chaining: before the first fetch, `loaded?.player` and an unfiltered
  // `playerId` are both undefined, which would compare as a match.
  const isLoaded = loaded !== null && loaded.player === playerId;
  const isLoading = !awaitingPlayer && !isLoaded;
  const games = isLoaded ? loaded.games : [];

  useEffect(() => {
    if (awaitingPlayer) return;

    let cancelled = false;

    const fetchGames = async () => {
      try {
        setError(null);
        const result = await getGames(playerId ?? undefined);
        if (!cancelled) setLoaded({ player: playerId, games: result });
      } catch (err) {
        if (cancelled) return;
        setError('Failed to load games. Please try again later.');
        console.error('Error fetching games:', err);
      }
    };

    fetchGames();
    return () => { cancelled = true; };
  }, [playerId, awaitingPlayer]);

  const options: ComboboxOption[] = useMemo(
    () => games.map(game => ({
      value: game.id,
      label: triggerLabel(game),
      // Everything on the row is typed into one string so searching by map,
      // mode or status works even though the row renders them separately.
      searchText: [
        `Game ${game.id}`,
        game.mode && titleCase(game.mode),
        game.map,
        statusLabel(game.status),
        game.winner,
        formatPlayers(game),
      ].filter(Boolean).join(' '),
      content: <GameRow game={game} />,
    })),
    [games],
  );

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  const triggerText = awaitingPlayer
    ? 'Select a player first'
    : isLoading
      ? (playerName ? `Loading ${playerName}'s games...` : 'Loading games...')
      : placeholder;

  const picker = (
    <Combobox
      value={gameId || null}
      onChange={value => setGameId(value || '')}
      options={options}
      placeholder={triggerText}
      searchPlaceholder="Search by id, map, mode or status..."
      emptyText={playerId !== undefined ? 'No games found for this player.' : 'No results found.'}
      disabled={disabled || isLoading || awaitingPlayer}
      // Swaps the chevron for a spinner, so the disabled state reads as "busy"
      // rather than "broken".
      loading={isLoading}
      clearable={false}
      className="game-select-popover"
    />
  );

  if (bare) return picker;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-lg font-medium">Select Game</p>
        {isLoading && <Spinner size={16} />}
      </div>

      {picker}
    </Card>
  );
}
