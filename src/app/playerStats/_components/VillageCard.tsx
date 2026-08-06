import BuildingIcon from '@/components/features/game/BuildingIcon';
import { Card } from '@/components/ui/card';
import type { BuildingCategoryMap } from '@/lib/game/buildingAssets';
import type { VillageStats } from '@/types/player';

interface VillageCardProps {
  villageStats: VillageStats;
  categories?: BuildingCategoryMap;
}

export default function VillageCard({ villageStats, categories }: VillageCardProps) {
  return (
    <Card className="building-group-card village-card p-4">
      <div className="flex items-start gap-4">
        {/* The HQ's artwork changes with its level, so it's passed through. */}
        <BuildingIcon
          buildingName="HQ"
          categories={categories}
          level={villageStats.level}
          size={72}
        />

        {/* Village Info */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-semibold">Village</p>

          <p className="text-base">Level {villageStats.level}</p>

          <div className="flex gap-4">
            <p className="text-sm text-muted-foreground">
              {villageStats.buildingCount}/{villageStats.totalCount} Buildings
            </p>
            <p className="text-sm text-muted-foreground">
              {villageStats.specialSlots} Special Slots
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
