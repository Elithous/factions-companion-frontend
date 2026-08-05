import StatsPanel from "@/components/features/stats/StatsPanel";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { StatsError } from "@/app/stats/_hooks/useGameStats";
import type { StatsFilter, ToFromFaction } from "@/types/stats";

interface PlayerGameStatsProps {
  hasPlayer: boolean;
  isLoading: boolean;
  error: StatsError | null;
  filter: StatsFilter;
  total: ToFromFaction;
  filteredData: ToFromFaction;
}

/** This game's faction totals next to the selected player's own totals. */
export default function PlayerGameStats({
  hasPlayer,
  isLoading,
  error,
  filter,
  total,
  filteredData,
}: PlayerGameStatsProps) {
  if (!hasPlayer) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Select a player to view their game stats.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error.message}</p>
      </Card>
    );
  }

  return (
    <div className="relative">
      <StatsPanel filter={filter} data={{ total, filtered: filteredData }} />
      {isLoading && (
        <div className="loading-overlay">
          <Spinner size={32} />
        </div>
      )}
    </div>
  );
}
