import { Card } from '@/components/ui/card';
import type { VillageStats } from '@/types/player';

interface VillageCardProps {
  villageStats: VillageStats;
}

export default function VillageCard({ villageStats }: VillageCardProps) {
  return (
    <Card className="building-group-card village-card p-4">
      <div className="flex items-start gap-4">
        {/* Village Image - placeholder for now */}
        <div className="building-image-placeholder">
          <p className="text-center text-xs text-muted-foreground">Image</p>
        </div>

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
