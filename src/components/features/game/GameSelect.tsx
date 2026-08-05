"use client";

import { Gamepad2 } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { getGames } from '@/lib/api/reports';
import { Card } from '@/components/ui/card';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';

interface GameSelectProps {
  gameId: string;
  setGameId: Dispatch<SetStateAction<string>>;
}

/** Game picker shared by the stats, config, calculator and player pages. */
export default function GameSelect({ gameId, setGameId }: GameSelectProps) {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const ids = await getGames();
        setOptions(ids.map(id => ({ value: id, label: `Game ${id}` })));
      } catch (err) {
        setError('Failed to load games. Please try again later.');
        console.error('Error fetching games:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} />
          <p className="text-lg font-medium">Select Game</p>
        </div>
        {isLoading && <Spinner size={16} />}
      </div>

      <Combobox
        value={gameId || null}
        onChange={value => setGameId(value || '')}
        options={options}
        placeholder="Choose a game"
        searchPlaceholder="Search games..."
        disabled={isLoading}
        clearable={false}
      />
    </Card>
  );
}
